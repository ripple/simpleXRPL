import type { Transaction } from 'xrpl'

import type {
  Account,
  AccountRef,
  Custodian,
  CustodianKind,
  SignedEnvelope,
  SignerCapabilities,
  SubmissionContext,
  SubmissionHandle,
  SubmissionResult,
  TransactorType,
} from '../../domain/index.js'
import {
  AccountNotFoundError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../errors.js'
import type { components } from '../../generated/custody.js'

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
import { buildCustomProperties } from './mapping/custom-properties.js'
import { buildProposeIntentBody } from './mapping/envelope.js'
import { buildSignManifestIntentBody } from './mapping/manifest-envelope.js'
import { NATIVE_XRPL_TRANSACTORS } from './mapping/xrpl-operations.js'
import { resolveSigningPublicKey } from './submission/account-key.js'
import { runDryRun } from './submission/dry-run.js'
import { pollIntentUntilExecuted } from './submission/intent-polling.js'
import {
  assembleSignedTransaction,
  buildSigningPreimage,
} from './submission/raw-sign.js'

export type {
  RippleCustodyAuthOptions,
  RippleCustodyFromEnvOptions,
  RippleCustodyOptions,
} from './construction.js'

/**
 * Ripple Custody adapter (TDD §3.3, §7.2): wraps the Custody REST API v1.
 * Native transactors ({@link NATIVE_XRPL_TRANSACTORS}) submit as a governed
 * `v0_CreateTransactionOrder` intent; everything else falls back to the
 * opt-in raw-signing path (`v0_SignManifest` + `Unsafe`) when
 * `allowRawSigning` is enabled.
 */
export class RippleCustody implements Custodian {
  /** This custodian wraps the Custody REST API. */
  public readonly kind: CustodianKind = 'ripple-custody'

  private readonly state: RippleCustodyState

  private constructor(state: RippleCustodyState) {
    this.state = state
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
    return RippleCustody.create(resolveFromEnvOptions(options))
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
   * @param tx - The fully autofilled transaction to submit.
   * @param ctx - The submission context.
   * @returns The submission result.
   * @throws {@link SignerCapabilityError} if raw signing is required but disabled.
   * @throws {@link IntentPendingError} if the custodian intent doesn't reach a
   * terminal state before the timeout.
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
    return {
      source: 'rippled',
      response,
      intent: undefined,
      txHash: response.result.hash,
    }
  }

  /**
   * Submit and return a handle once the backend has accepted the intent.
   *
   * @returns Never; rejects until async submission is wired (DGE-7466).
   * @throws {@link SimpleXRPLError} always, at this layer.
   */
  // eslint-disable-next-line class-methods-use-this -- Stub pending DGE-7466 (matches LocalSigner's own stub).
  public async submitAsync(): Promise<SubmissionHandle> {
    throw new SimpleXRPLError(
      'Async submission is not yet implemented for RippleCustody',
    )
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
    const { client, domainId } = this.state
    const accountId = this.requireAccountId(ctx.account)
    const body = buildProposeIntentBody(this.state.intentSigner, {
      domainId,
      authorUserId: this.state.authorUserId,
      accountId,
      transaction: tx,
      fee: ctx.fee ?? this.state.defaultFee,
      idempotencyKey: ctx.idempotencyKey,
    })
    await this.maybeDryRun(
      ctx,
      body.request.payload,
      body.request.customProperties,
    )
    await client.post('/v1/intents', body)

    const executed = await pollIntentUntilExecuted({
      client,
      domainId,
      intentId: body.request.id,
      timeoutMs: ctx.timeoutMs ?? this.state.defaultTimeoutMs,
    })
    return {
      source: 'custody',
      // Resolving the on-ledger txHash from the executed intent is DGE-7466's
      // governance-observation surface; the raw executed entity is exposed
      // verbatim in the meantime.
      response: executed,
      intent: undefined,
      intentId: body.request.id,
    }
  }

  /**
   * Run the raw-signing path: resolve the account's public key, build and
   * sign the preimage, submit the `v0_SignManifest` intent, poll it to
   * completion, then reassemble the fully signed transaction.
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
    this.assertRawEligible(tx.TransactionType)
    const { client, domainId } = this.state
    const accountId = this.requireAccountId(ctx.account)
    const { preparedTx, body } = await this.buildManifestEnvelope(
      tx,
      ctx,
      accountId,
    )
    await this.maybeDryRun(
      ctx,
      body.request.payload,
      body.request.customProperties,
    )
    await client.post('/v1/intents', body)

    const manifestId = body.request.id
    await pollIntentUntilExecuted({
      client,
      domainId,
      intentId: manifestId,
      timeoutMs: ctx.timeoutMs ?? this.state.defaultTimeoutMs,
    })
    const signatureBase64 = await this.fetchManifestSignature(
      accountId,
      manifestId,
    )
    return assembleSignedTransaction(preparedTx, signatureBase64)
  }

  /**
   * Resolve the account's public key and build the signed `v0_SignManifest`
   * envelope for its preimage.
   *
   * @param tx - The fully autofilled transaction to sign.
   * @param ctx - The submission context.
   * @param accountId - The Custody account UUID that owns `tx`.
   * @returns The `SigningPubKey`-stamped transaction and the signed envelope.
   */
  private async buildManifestEnvelope(
    tx: Transaction,
    ctx: SubmissionContext,
    accountId: string,
  ): Promise<{
    preparedTx: Transaction
    body: ReturnType<typeof buildSignManifestIntentBody>
  }> {
    const { domainId } = this.state
    const publicKeyBase64 = await resolveSigningPublicKey(
      this.state.client,
      domainId,
      accountId,
    )
    const { preparedTx, preimageBase64 } = buildSigningPreimage(
      tx,
      publicKeyBase64,
    )
    const body = buildSignManifestIntentBody(
      this.state.intentSigner,
      buildCustomProperties(tx),
      {
        domainId,
        authorUserId: this.state.authorUserId,
        accountId,
        preimageBase64,
        idempotencyKey: ctx.idempotencyKey,
      },
    )
    return { preparedTx, body }
  }

  /**
   * Fetch an executed manifest's raw signature.
   *
   * @param accountId - The Custody account UUID that signed it.
   * @param manifestId - The manifest id (the envelope's own id).
   * @returns The signature, base64-encoded.
   * @throws {@link SignerCapabilityError} if Custody returned no raw signature.
   */
  private async fetchManifestSignature(
    accountId: string,
    manifestId: string,
  ): Promise<string> {
    const { client, domainId } = this.state
    const manifest = await client.get<
      components['schemas']['Core_ApiManifest']
    >(`/v1/domains/${domainId}/accounts/${accountId}/manifests/${manifestId}`)
    const { value } = manifest.data
    if (value?.type !== 'Unsafe') {
      throw new SignerCapabilityError(
        `RippleCustody did not return a raw signature for manifest '${manifestId}'.`,
      )
    }
    return value.signature
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
   * Guard the raw-signing path: it only applies to non-native transactors,
   * and only when explicitly enabled.
   *
   * @param transactor - The transactor being signed.
   * @throws {@link SignerCapabilityError} if `transactor` is native, or raw
   * signing is disabled.
   */
  private assertRawEligible(transactor: TransactorType): void {
    if (NATIVE_XRPL_TRANSACTORS.has(transactor)) {
      throw new SignerCapabilityError(
        `RippleCustody signs ${transactor} through its governed native path; there is no standalone signed envelope to produce. Call submitAndWait instead of sign.`,
      )
    }
    if (!this.state.allowRawSigning) {
      throw new SignerCapabilityError(
        `RippleCustody cannot sign ${transactor}: it has no native operation for it and allowRawSigning is disabled. Enable allowRawSigning, or use a different signer for this account.`,
      )
    }
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
