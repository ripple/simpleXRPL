import type { Transaction } from 'xrpl'

import type {
  Account,
  AccountRef,
  Custodian,
  CustodianKind,
  IntentObserver,
  OnChainResult,
  SignedEnvelope,
  SignerCapabilities,
  SubmissionContext,
  SubmissionHandle,
  SubmissionResult,
} from '../../domain/index.js'
import {
  AccountNotFoundError,
  CustodyApiError,
  IntentPendingError,
  SimpleXRPLError,
  XrpldSubmitError,
} from '../../errors.js'
import type { components } from '../../generated/custody.js'
import { assertOnLedgerSuccess, engineResultOf } from '../on-ledger-result.js'

import {
  buildRippleCustodyState,
  resolveFromEnvOptions,
} from './construction.js'
import type {
  RippleCustodyFromEnvOptions,
  RippleCustodyOptions,
  RippleCustodyState,
} from './construction.js'
import { AccountContext } from './discovery/account-context.js'
import { discoverXrplAccounts } from './discovery/account-discovery.js'
import { buildProposeIntentBody } from './mapping/envelope.js'
import { NATIVE_XRPL_TRANSACTORS } from './mapping/xrpl-operations.js'
import { runDryRun } from './submission/dry-run.js'
import { createCustodyIntentHandle } from './submission/intent-handle.js'
import { pollIntentUntilExecuted } from './submission/intent-polling.js'
import { signRawTransaction } from './submission/raw-flow.js'
import { pollTransactionOnChain as pollTxOnChain } from './submission/transaction-polling.js'

export type {
  RippleCustodyAuthOptions,
  RippleCustodyFromEnvOptions,
  RippleCustodyOptions,
} from './construction.js'

/**
 * HTTP status Custody returns when an intent with the posted id already exists.
 * The intent id is the caller's idempotency key, so a 409 is the custodian's
 * de-duplication firing on a same-key re-drive — expected, not an error.
 */
const HTTP_CONFLICT = 409

/**
 * Ripple Custody adapter (TDD §3.3, §7.2): wraps the Custody REST API v1.
 * Native transactors ({@link NATIVE_XRPL_TRANSACTORS}) submit as a governed
 * `v0_CreateTransactionOrder` intent; everything else falls back to the
 * opt-in raw-signing path (`v0_SignManifest` + `Unsafe`) when
 * `allowRawSigning` is enabled.
 */
export class RippleCustody implements Custodian, IntentObserver {
  /** This custodian wraps the Custody REST API. */
  public readonly kind: CustodianKind = 'ripple-custody'

  private readonly state: RippleCustodyState

  private constructor(state: RippleCustodyState) {
    this.state = state
  }

  /**
   * The Custody domain this custodian is bound to — the tenant two instances
   * collide on, which the client rejects at init.
   *
   * @returns The domain id.
   */
  public get tenantId(): string {
    return this.state.domainId
  }

  /**
   * The primary account this custodian owns.
   *
   * @returns The primary account reference.
   */
  public get primary(): AccountRef {
    return { address: this.state.primaryAddress }
  }

  /**
   * Authenticate, resolve the intent-author's identity, and discover the
   * domain's XRPL accounts.
   *
   * @param options - Gateway/auth/domain config, the primary account, and
   * optional raw-signing/fee/dry-run/timeout defaults.
   * @returns A ready RippleCustody.
   * @throws {@link CustodyAuthError} if the authenticated user has no access
   * to `options.domainId`.
   * @throws {@link AccountNotFoundError} if `options.primary` was not discovered.
   */
  public static async create(
    options: RippleCustodyOptions,
  ): Promise<RippleCustody> {
    const state = await buildRippleCustodyState(options)
    const custody = new RippleCustody(state)
    const accounts = await custody.listAccounts()
    new AccountContext(accounts).validatePrimary(options.primary)
    return custody
  }

  /**
   * Build a RippleCustody from `RIPPLE_CUSTODY_*` environment variables (TDD
   * §3.3).
   *
   * @param options - The primary account, optional overrides, and environment source.
   * @returns A ready RippleCustody.
   * @throws {@link SimpleXRPLError} if a required environment variable is missing.
   */
  public static async fromEnv(
    options: RippleCustodyFromEnvOptions,
  ): Promise<RippleCustody> {
    return RippleCustody.create(await resolveFromEnvOptions(options))
  }

  /**
   * Report the native transactor set and whether raw signing is enabled.
   *
   * @returns This custodian's capabilities.
   */
  public capabilities(): SignerCapabilities {
    return {
      nativeOps: NATIVE_XRPL_TRANSACTORS,
      allowRaw: this.state.allowRawSigning,
    }
  }

  /**
   * Discover this domain's XRPL accounts, live (TDD §9.2) — not cached, so
   * `client.refreshAccounts()` sees additions/removals on the next call.
   *
   * @returns The discovered accounts.
   */
  public async listAccounts(): Promise<Account[]> {
    return discoverXrplAccounts(this.state.client, this.state.domainId, this)
  }

  /**
   * Produce a signed, submittable envelope via the raw-signing path (TDD
   * §7.2 RippleRaw). Only meaningful for a transactor with no native
   * operation — Custody signs and submits native operations atomically as
   * one governed action, so there is no standalone signed envelope for those.
   *
   * @param tx - The fully autofilled transaction to sign.
   * @param ctx - The submission context (source account, dry-run/timeout options).
   * @returns The signed transaction blob and hash.
   * @throws {@link SignerCapabilityError} if `tx`'s transactor is native, or
   * raw signing is disabled.
   */
  public async sign(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SignedEnvelope> {
    return this.signRaw(tx, ctx)
  }

  /**
   * Submit and block until the transaction reaches a terminal state (TDD
   * §10.1): native transactors go through the governed
   * `v0_CreateTransactionOrder` intent; everything else through the
   * raw-signing fallback, then the shared `xrpl.js` client.
   *
   * Re-submitting a native transactor with an idempotency key the custodian has
   * already accepted is transparent: it resolves to the existing intent instead
   * of failing or creating a duplicate. Use this to safely re-drive a call
   * whose result you never saw.
   *
   * @param tx - The fully autofilled transaction to submit.
   * @param ctx - The submission context.
   * @returns The submission result.
   * @throws {@link SignerCapabilityError} if raw signing is required but disabled.
   * @throws {@link IntentPendingError} if the custodian intent doesn't reach a
   * terminal state before the timeout.
   * @throws {@link XrpldSubmitError} on a non-`tesSUCCESS` engine result from
   * the raw path.
   */
  public async submitAndWait(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> {
    if (NATIVE_XRPL_TRANSACTORS.has(tx.TransactionType)) {
      return this.submitNative(tx, ctx)
    }
    const envelope = await this.signRaw(tx, ctx)
    const response = await ctx.ledger.submitAndWait(envelope.txBlob)
    const engineResult = engineResultOf(response)
    if (engineResult !== undefined && engineResult !== 'tesSUCCESS') {
      throw new XrpldSubmitError(engineResult, response)
    }
    return {
      source: 'xrpld',
      response,
      intent: undefined,
      txHash: response.result.hash,
    }
  }

  /**
   * Submit and hand back a {@link SubmissionHandle} as soon as Custody has
   * accepted the intent, without blocking on the governance outcome (TDD
   * §10.2). Best for M-of-N approval flows that may span hours: the caller
   * polls or waits on the handle, or resumes later via `client.intent`.
   *
   * Re-submitting with an already-accepted idempotency key hands back a handle
   * over the existing intent rather than creating a duplicate (the custodian's
   * conflict response is absorbed).
   *
   * @param tx - The fully autofilled transaction to submit.
   * @param ctx - The submission context.
   * @returns A handle over the accepted intent.
   * @throws {@link SimpleXRPLError} if `tx` needs the raw-signing path — async
   * submission there is not yet supported (use `submitAndWait`).
   * @throws {@link SignerCapabilityError} if the custodian cannot sign the transactor.
   */
  public async submitAsync(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionHandle> {
    if (!NATIVE_XRPL_TRANSACTORS.has(tx.TransactionType)) {
      throw new SimpleXRPLError(
        `Async submission is not supported for the RippleRaw path (${tx.TransactionType}); use submitAndWait for raw-signed transactors.`,
      )
    }
    const intentId = await this.postNativeIntent(tx, ctx)
    return this.observeIntent(intentId)
  }

  /**
   * Poll the Custody transaction layer until the on-chain transaction linked to
   * `intentId` is confirmed, then return its MPT issuance ID. Returns an empty
   * string if the transaction is not confirmed within `timeoutMs`.
   *
   * Poll the Custody transaction layer until the XRPL transaction linked to
   * `intentId` is confirmed on-chain, then return its outcome.
   *
   * @param intentId - The intent/order ID to look up.
   * @param timeoutMs - How long to poll (defaults to the custodian's configured
   *   intent timeout).
   * @returns The on-chain result once confirmed, or `undefined` on timeout.
   */
  public async pollTransactionOnChain(
    intentId: string,
    timeoutMs?: number,
  ): Promise<OnChainResult | undefined> {
    return pollTxOnChain({
      client: this.state.client,
      domainId: this.state.domainId,
      intentId,
      timeoutMs: timeoutMs ?? this.state.defaultTimeoutMs,
    })
  }

  /**
   * Convenience wrapper for `Token.issue`: polls until the transaction is
   * confirmed and returns the MPT issuance ID, or an empty string on timeout.
   *
   * @param intentId - The intent/order ID to look up.
   * @returns The MPT issuance ID, or an empty string on timeout.
   */
  public async pollMptIssuanceId(intentId: string): Promise<string> {
    const result = await this.pollTransactionOnChain(intentId)
    return result?.mptIssuanceId ?? ''
  }

  /**
   * Resume observation of a native intent this custodian previously created,
   * addressed by id (TDD §10.4) — the resume surface behind
   * `client.intent.status` / `client.intent.await`.
   *
   * @param intentId - The client-generated intent id returned at submission.
   * @returns A handle to poll or wait on the intent's outcome.
   */
  public observeIntent(intentId: string): SubmissionHandle {
    return createCustodyIntentHandle({
      client: this.state.client,
      domainId: this.state.domainId,
      custodian: this,
      intentId,
      defaultTimeoutMs: this.state.defaultTimeoutMs,
    })
  }

  /**
   * Submit a native operation intent and poll it to a terminal state.
   *
   * @param tx - The transaction to map and submit.
   * @param ctx - The submission context.
   * @returns The submission result.
   */
  private async submitNative(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> {
    const timeoutMs = ctx.timeoutMs ?? this.state.defaultTimeoutMs
    const intentId = await this.postNativeIntent(tx, ctx)
    // The intent reaching `Executed` only means Custody submitted the XRPL
    // transaction — a separate, on-chain layer decides whether it actually
    // applied. Stopping here reported a `tec` (on-ledger, fee burned, intent
    // *not* achieved) as success, so drive on to the on-chain outcome.
    const executed = await pollIntentUntilExecuted({
      client: this.state.client,
      domainId: this.state.domainId,
      intentId,
      timeoutMs,
    })
    const onChain = await pollTxOnChain({
      client: this.state.client,
      domainId: this.state.domainId,
      intentId,
      timeoutMs,
    })
    // `undefined` is the indeterminate outcome: the transaction never reached a
    // terminal ledger state within the budget. It may yet confirm, so surface it
    // as pending rather than success — a retry must re-drive the same intent.
    if (onChain === undefined) {
      throw new IntentPendingError(intentId, 'ripple-custody', 'Executed')
    }
    // Custody exposes no raw engine result, so confirm `tesSUCCESS` straight off
    // the ledger by hash. A `tec` on-ledger transaction throws here.
    await assertOnLedgerSuccess({
      ledger: ctx.ledger,
      txHash: onChain.txHash,
      custodian: 'ripple-custody',
      intentId,
    })
    return {
      source: 'custody',
      response: executed,
      intent: undefined,
      intentId,
      txHash: onChain.txHash,
    }
  }

  /**
   * Build, optionally dry-run, and POST a native `v0_CreateTransactionOrder`
   * intent. Shared by the sync ({@link submitNative}) and async
   * ({@link submitAsync}) paths, which differ only in how they wait afterward.
   *
   * The intent id is derived from the caller's idempotency key, so re-driving a
   * key the custodian has already accepted is safe: Custody answers the second
   * POST with `409 Conflict`, which this treats as "already submitted" and
   * absorbs, returning the existing intent id. The caller's wait/observe then
   * resolves that original intent rather than creating a duplicate — so a retry
   * with the same key can never double-apply. Any other error is re-thrown.
   *
   * @param tx - The transaction to map and submit.
   * @param ctx - The submission context.
   * @returns The client-generated intent id Custody accepted (or already had).
   */
  private async postNativeIntent(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<string> {
    const accountId = this.requireAccountId(ctx.account)
    const body = buildProposeIntentBody(this.state.intentSigner, {
      domainId: this.state.domainId,
      authorUserId: this.state.authorUserId,
      accountId,
      ledgerId: ctx.account.ledgerId,
      transaction: tx,
      fee: ctx.fee ?? this.state.defaultFee,
      idempotencyKey: ctx.idempotencyKey,
    })
    await this.maybeDryRun(
      ctx,
      body.request.payload,
      body.request.customProperties,
    )
    try {
      await this.state.client.post('/v1/intents', body)
    } catch (error) {
      // A 409 means this idempotency key already created an intent: the
      // de-duplication working as intended, not a failure. Absorb it and fall
      // through to return the existing intent id.
      if (
        !(error instanceof CustodyApiError) ||
        error.status !== HTTP_CONFLICT
      ) {
        throw error
      }
    }
    return body.request.id
  }

  /**
   * Run the raw-signing path, delegating to the raw-flow module.
   *
   * @param tx - The fully autofilled transaction to sign.
   * @param ctx - The submission context.
   * @returns The signed transaction blob and hash.
   * @throws {@link SignerCapabilityError} if `tx`'s transactor is native, or
   * raw signing is disabled.
   */
  private async signRaw(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SignedEnvelope> {
    return signRawTransaction({
      state: this.state,
      tx,
      ctx,
      accountId: this.requireAccountId(ctx.account),
      maybeDryRun: async (payload, customProperties) =>
        this.maybeDryRun(ctx, payload, customProperties),
    })
  }

  /**
   * Pre-flight an intent payload through Custody's dry-run when requested,
   * per-call or via the custodian's own default (TDD §5.2).
   *
   * @param ctx - The submission context (carries the per-call `dryRun` override).
   * @param payload - The intent payload about to be submitted.
   * @param customProperties - The same summary the real intent will carry.
   */
  private async maybeDryRun(
    ctx: SubmissionContext,
    payload: components['schemas']['Core_IntentDryRunRequest']['payload'],
    customProperties: components['schemas']['Core_StringsMap'],
  ): Promise<void> {
    if (!(ctx.dryRun ?? this.state.defaultDryRun)) {
      return
    }
    await runDryRun(this.state.client, {
      domainId: this.state.domainId,
      authorUserId: this.state.authorUserId,
      payload,
      customProperties,
    })
  }

  /**
   * Read the resolved account's Custody account UUID.
   *
   * @param account - The resolved source account.
   * @returns The Custody account UUID.
   * @throws {@link AccountNotFoundError} if the account has no Custody id.
   */
  // eslint-disable-next-line class-methods-use-this -- Kept as a method for cohesion with the class it guards.
  private requireAccountId(account: Account): string {
    if (typeof account.custodianRef !== 'string') {
      throw new AccountNotFoundError(account.address)
    }
    return account.custodianRef
  }
}
