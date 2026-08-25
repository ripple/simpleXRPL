import { encodeForSigning } from 'xrpl'
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
} from '../../domain/index.js'
import {
  AccountNotFoundError,
  IntentPendingError,
  XrpldSubmitError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../errors.js'
import type { PalisadeScope } from '../../generated/palisade-routes.js'
import type { components } from '../../generated/palisade.js'
import { assertDryRunHonored, assertFeeHonored } from '../context-guards.js'
import { assertOnLedgerSuccess, engineResultOf } from '../on-ledger-result.js'

import { PalisadeApi } from './api.js'
import type { PalisadeScopedClients } from './api.js'
import { PalisadeAuthService } from './auth/palisade-auth.service.js'
import type {
  PalisadeClientCredentials,
  PalisadeCustodyConfig,
} from './config.js'
import { PalisadeWalletContext } from './discovery/wallet-context.js'
import { discoverXrplWallets } from './discovery/wallet-discovery.js'
import {
  buildRawTransactionBody,
  PALISADE_NATIVE_TRANSACTORS,
  txToNativeSubmit,
} from './mapping/index.js'
import { FetchHttpPort } from './transport/fetch-http-port.js'
import { HttpPalisadeAuthPort } from './transport/http-palisade-auth-port.js'
import { PalisadeHttpClient } from './transport/palisade-http-client.js'
import { PalisadeTxTracker } from './tx-tracker.js'

type PalisadeTransaction = components['schemas']['transactionsv2Transaction']

const DEFAULT_TIMEOUT_MS = 60_000

/**
 * The Palisade custodian: signs and submits through Palisade's vault/wallet API.
 * A transactor Palisade models natively uses its `Submit*`/transfer op; anything
 * else falls back to the raw sign-only path (`allowRawSigning`) and is submitted
 * through the shared ledger. Native submissions can also run async, returning a
 * handle to poll, wait on, or cancel.
 */
export class PalisadeCustody implements Custodian {
  public readonly kind: CustodianKind = 'palisade-custody'

  /** The Palisade API client identity — the tenant two instances collide on. */
  public readonly tenantId: string

  /**
   * Low-level, typed access to the full Palisade v2 API — a secondary surface
   * beside the first-class verticals, for operations simpleXRPL doesn't model.
   */
  public readonly api: PalisadeApi

  private readonly client: PalisadeHttpClient
  private readonly allowRaw: boolean
  private readonly tracker: PalisadeTxTracker
  private context: PalisadeWalletContext
  private primaryAccount: Account | undefined

  private constructor(
    clients: {
      transactions: PalisadeHttpClient
      wallets: PalisadeHttpClient
      byScope: PalisadeScopedClients
    },
    options: { allowRaw: boolean; timeoutMs: number; tenantId: string },
  ) {
    this.client = clients.transactions
    this.allowRaw = options.allowRaw
    this.tenantId = options.tenantId
    this.tracker = new PalisadeTxTracker(
      clients.transactions,
      this.kind,
      options.timeoutMs,
    )
    this.context = new PalisadeWalletContext([])
    this.api = new PalisadeApi(
      clients.wallets,
      clients.transactions,
      clients.byScope,
    )
  }

  /**
   * The primary account this custodian owns.
   *
   * @returns The primary account reference.
   * @throws {@link SimpleXRPLError} if the custodian is not fully initialized.
   */
  public get primary(): AccountRef {
    if (this.primaryAccount === undefined) {
      throw new SimpleXRPLError('PalisadeCustody is not initialized')
    }
    return {
      address: this.primaryAccount.address,
      custodianRef: this.primaryAccount.custodianRef,
    }
  }

  /**
   * Build a Palisade custodian: exchange credentials, discover the org's XRPL
   * wallets, and bind the configured primary.
   *
   * @param config - Endpoints, credentials, primary wallet, and options.
   * @returns A ready custodian.
   * @throws {@link AccountNotFoundError} if the primary wallet isn't discovered.
   */
  public static async create(
    config: PalisadeCustodyConfig,
  ): Promise<PalisadeCustody> {
    const http = config.http ?? new FetchHttpPort()
    // A separate authenticated client per credential: discovery runs on the
    // wallet-read credential, signing/submission on the transactions one.
    function clientFor(creds: PalisadeClientCredentials): PalisadeHttpClient {
      return new PalisadeHttpClient({
        baseUrl: config.baseUrl,
        http,
        auth: new PalisadeAuthService({
          authPort: new HttpPalisadeAuthPort({ baseUrl: config.baseUrl, http }),
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          now: config.now,
        }),
      })
    }
    const walletsClient = clientFor(config.credentials.wallets)
    const transactionsClient = clientFor(config.credentials.transactions)
    // Per-scope clients for tag-based routing (option b) on `palisade.api`.
    const byScope: PalisadeScopedClients = {}
    for (const [scope, creds] of Object.entries(
      config.credentials.scoped ?? {},
    )) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.entries widens the key to string.
      byScope[scope as PalisadeScope] = clientFor(creds)
    }
    const custodian = new PalisadeCustody(
      { transactions: transactionsClient, wallets: walletsClient, byScope },
      {
        allowRaw: config.allowRawSigning ?? false,
        timeoutMs: config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
        tenantId: config.credentials.transactions.clientId,
      },
    )
    const accounts = await discoverXrplWallets(walletsClient, custodian)
    custodian.context = new PalisadeWalletContext(accounts)
    custodian.primaryAccount = resolvePrimary(accounts, config.primary)
    return custodian
  }

  /**
   * Capabilities: the natively-mapped transactors, plus the raw fallback when
   * enabled.
   *
   * @returns This custodian's signer capabilities.
   */
  public capabilities(): SignerCapabilities {
    return {
      nativeOps: new Set(PALISADE_NATIVE_TRANSACTORS),
      allowRaw: this.allowRaw,
    }
  }

  /**
   * List the discovered XRPL wallets as accounts.
   *
   * @returns The accounts this custodian owns.
   */
  public async listAccounts(): Promise<Account[]> {
    return this.context.list()
  }

  /**
   * Raw-sign a transaction: Palisade signs the payload it is given and returns
   * the assembled signed transaction for submission through the shared ledger.
   *
   * The payload is `encodeForSigning` output — the STX-prefixed signing
   * preimage — not `encode` output. Palisade hashes the caller's bytes as-is
   * and does not add XRPL's `STX\0` (`0x53545800`) prefix itself, so a plain
   * `encode` payload yields a signature XRPL rejects as `Invalid signature`.
   * Palisade strips the recognized prefix before assembling `signedTransaction`.
   *
   * @param tx - The transaction to sign (network fields resolved).
   * @param ctx - The submission context (source account + ledger).
   * @returns The signed envelope.
   * @throws {@link SignerCapabilityError} if raw signing is disabled, or the
   *   account exposes no public key.
   */
  public async sign(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SignedEnvelope> {
    if (!this.allowRaw) {
      throw new SignerCapabilityError(
        `Palisade signs ${tx.TransactionType} only through its raw sign-only ` +
          `path, which is disabled. Enable allowRawSigning, or use a signer ` +
          `that models ${tx.TransactionType} natively.`,
      )
    }
    this.assertContextHonored(ctx)
    const filled =
      tx.Sequence === undefined ? await ctx.ledger.autofill(tx) : tx
    // XRPL computes TxnSignature over the transaction *including*
    // SigningPubKey, and it is part of the signing preimage — so it must be set
    // before encoding, not patched in afterwards. Without it the signature is
    // silently invalid, so fail loudly instead.
    if (ctx.account.publicKey === undefined) {
      throw new SignerCapabilityError(
        `Palisade raw signing needs the wallet's public key to build the ` +
          `signing payload, and none was discovered for ${ctx.account.address}.`,
      )
    }
    const toSign = {
      ...filled,
      SigningPubKey: ctx.account.publicKey.toUpperCase(),
    }
    const base = this.transactionsBase(ctx.account)
    const submitted = await this.client.post<PalisadeTransaction>(
      `${base}/raw`,
      buildRawTransactionBody(encodeForSigning(toSign), ctx.idempotencyKey),
    )
    // Palisade signs asynchronously: the POST can return before the signature
    // is ready, so poll until `signedTransaction` is populated (a sign-only
    // request stops at SIGNED, not CONFIRMED).
    const signed =
      submitted.signedTransaction === undefined
        ? await this.tracker.pollUntilSigned(base, submitted, ctx.timeoutMs)
        : submitted
    if (signed.signedTransaction === undefined) {
      throw new SimpleXRPLError(
        'Palisade raw signing returned no signed transaction',
      )
    }
    return { txBlob: signed.signedTransaction, hash: signed.hash }
  }

  /**
   * Submit and wait for a terminal result via the native op when the transactor
   * is supported, else the raw path (when enabled).
   *
   * @param tx - The autofilled transaction.
   * @param ctx - The submission context.
   * @returns The submission result.
   * @throws {@link SignerCapabilityError} if unsupported and raw is disabled.
   */
  public async submitAndWait(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> {
    this.assertContextHonored(ctx)
    if (PALISADE_NATIVE_TRANSACTORS.has(tx.TransactionType)) {
      try {
        const { subPath, body } = txToNativeSubmit(tx, ctx.idempotencyKey)
        return await this.submitNative(subPath, body, ctx)
      } catch (error) {
        if (error instanceof SignerCapabilityError && this.allowRaw) {
          return this.submitRaw(tx, ctx)
        }
        throw error
      }
    }
    if (!this.allowRaw) {
      throw new SignerCapabilityError(
        `Palisade cannot natively sign ${tx.TransactionType} and raw signing ` +
          'is disabled. Enable allowRawSigning or use a Local account.',
      )
    }
    return this.submitRaw(tx, ctx)
  }

  /**
   * Submit a native (governance) transactor without waiting: POST the op and
   * return a handle to poll, wait on, or cancel. Only natively-mapped
   * transactors are async — the raw path signs and submits inline, so it has no
   * pending intent to hand back.
   *
   * @param tx - The transaction to submit.
   * @param ctx - The submission context.
   * @returns A handle over the pending Palisade transaction.
   * @throws {@link SimpleXRPLError} if the transactor has no native path.
   */
  public async submitAsync(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionHandle> {
    this.assertContextHonored(ctx)
    if (!PALISADE_NATIVE_TRANSACTORS.has(tx.TransactionType)) {
      throw new SimpleXRPLError(
        `Palisade async submission supports only natively-mapped transactors; ` +
          `${tx.TransactionType} would take the raw path — use submitAndWait.`,
      )
    }
    const { subPath, body } = txToNativeSubmit(tx, ctx.idempotencyKey)
    const base = this.transactionsBase(ctx.account)
    const submitted = await this.client.post<PalisadeTransaction>(
      `${base}/${subPath}`,
      body,
    )
    return this.tracker.makeHandle(this, {
      base,
      submitted,
      timeoutMs: ctx.timeoutMs,
    })
  }

  /**
   * POST a native submission, then poll to a terminal status.
   *
   * @param subPath - The wallet-relative op sub-path.
   * @param body - The typed request body.
   * @param ctx - The submission context.
   * @returns The palisade-sourced submission result.
   */
  private async submitNative(
    subPath: string,
    body: unknown,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> {
    const base = this.transactionsBase(ctx.account)
    const submitted = await this.client.post<PalisadeTransaction>(
      `${base}/${subPath}`,
      body,
    )
    const final = await this.tracker.pollUntilTerminal(
      base,
      submitted,
      ctx.timeoutMs,
    )
    // Palisade's `CONFIRMED` means the transaction reached the ledger, not that
    // it achieved its intent — a `tec` (on-ledger, fee burned) can wear it too.
    // Palisade surfaces no engine result, so confirm `tesSUCCESS` off the ledger
    // by hash; a `tec` throws here rather than being reported as success. A
    // `CONFIRMED` transaction without a hash is indeterminate, not success.
    if (final.hash === undefined) {
      throw new IntentPendingError(final.id, 'palisade-custody', final.status)
    }
    await assertOnLedgerSuccess({
      ledger: ctx.ledger,
      txHash: final.hash,
      custodian: 'palisade-custody',
      intentId: final.id,
    })
    return this.tracker.toResult(final)
  }

  /**
   * Reject a context asking for a control Palisade cannot honor. Palisade
   * exposes no dry-run endpoint, and its XRPL operations model no fee field the
   * SDK's {@link FeeIntent} maps onto — so both would be silently dropped.
   *
   * @param ctx - The submission context.
   * @throws {@link SignerCapabilityError} if `dryRun` or `fee` is set.
   */
  // eslint-disable-next-line class-methods-use-this -- reads only its argument
  private assertContextHonored(ctx: SubmissionContext): void {
    assertDryRunHonored(
      ctx,
      'Palisade',
      'Drop dryRun, or route the pre-flight through a RippleCustody account.',
    )
    assertFeeHonored(
      ctx,
      'Palisade',
      'Drop fee and let Palisade price the transaction, or use a RippleCustody account.',
    )
  }

  /**
   * The wallet-relative transactions base path for an account.
   *
   * @param account - The account being acted on.
   * @returns The `/v2/vaults/{vaultId}/wallets/{walletId}/transactions` path.
   */
  private transactionsBase(account: Account): string {
    const ref = this.walletRef(account)
    return `/v2/vaults/${ref.vaultId}/wallets/${ref.walletId}/transactions`
  }

  /**
   * Raw-sign then submit through the shared ledger and wait for `tesSUCCESS`.
   *
   * @param tx - The transaction to submit.
   * @param ctx - The submission context.
   * @returns The xrpld-sourced submission result.
   * @throws {@link XrpldSubmitError} on a non-`tesSUCCESS` engine result.
   */
  private async submitRaw(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> {
    const envelope = await this.sign(tx, ctx)
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
   * Resolve the Palisade vault/wallet coordinates for an account.
   *
   * @param account - The account being acted on.
   * @returns The vault and wallet ids.
   * @throws {@link AccountNotFoundError} if the account has no Palisade ref.
   */
  // eslint-disable-next-line class-methods-use-this -- reads only its argument
  private walletRef(account: Account): {
    vaultId: string
    walletId: string
  } {
    const ref = account.custodianRef
    if (typeof ref !== 'object') {
      throw new AccountNotFoundError(account.address)
    }
    return { vaultId: ref.vaultId, walletId: ref.walletId }
  }
}

/**
 * Find the discovered account matching the configured primary wallet.
 *
 * @param accounts - The discovered accounts.
 * @param primary - The configured primary wallet ref.
 * @param primary.vaultId - The primary wallet's vault id.
 * @param primary.walletId - The primary wallet's id.
 * @returns The matching account.
 * @throws {@link AccountNotFoundError} if none matches.
 */
function resolvePrimary(
  accounts: readonly Account[],
  primary: { vaultId: string; walletId: string },
): Account {
  const match = accounts.find((account) => {
    const ref = account.custodianRef
    return (
      typeof ref === 'object' &&
      ref.vaultId === primary.vaultId &&
      ref.walletId === primary.walletId
    )
  })
  if (match === undefined) {
    throw new AccountNotFoundError(
      `Palisade wallet ${primary.vaultId}/${primary.walletId}`,
    )
  }
  return match
}
