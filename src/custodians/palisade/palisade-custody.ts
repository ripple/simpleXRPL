import { encode } from 'xrpl'
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
  XrpldSubmitError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../errors.js'
import type { components } from '../../generated/palisade.js'

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

  private readonly client: PalisadeHttpClient
  private readonly allowRaw: boolean
  private readonly tracker: PalisadeTxTracker
  private context: PalisadeWalletContext
  private primaryAccount: Account | undefined

  private constructor(
    client: PalisadeHttpClient,
    options: { allowRaw: boolean; timeoutMs: number; tenantId: string },
  ) {
    this.client = client
    this.allowRaw = options.allowRaw
    this.tenantId = options.tenantId
    this.tracker = new PalisadeTxTracker(client, this.kind, options.timeoutMs)
    this.context = new PalisadeWalletContext([])
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
    const custodian = new PalisadeCustody(transactionsClient, {
      allowRaw: config.allowRawSigning ?? false,
      timeoutMs: config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
      tenantId: config.credentials.transactions.clientId,
    })
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
   * Raw-sign a transaction: Palisade signs the encoded blob (`signOnly`) and
   * returns the signed transaction for submission through the shared ledger.
   *
   * @param tx - The transaction to sign (network fields resolved).
   * @param ctx - The submission context (source account + ledger).
   * @returns The signed envelope.
   */
  public async sign(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SignedEnvelope> {
    const ref = this.walletRef(ctx.account)
    const filled =
      tx.Sequence === undefined ? await ctx.ledger.autofill(tx) : tx
    const signed = await this.client.post<PalisadeTransaction>(
      `/v2/vaults/${ref.vaultId}/wallets/${ref.walletId}/transactions/raw`,
      buildRawTransactionBody(encode(filled), ctx.idempotencyKey),
    )
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
    if (PALISADE_NATIVE_TRANSACTORS.has(tx.TransactionType)) {
      try {
        const { subPath, body } = txToNativeSubmit(tx)
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
    if (!PALISADE_NATIVE_TRANSACTORS.has(tx.TransactionType)) {
      throw new SimpleXRPLError(
        `Palisade async submission supports only natively-mapped transactors; ` +
          `${tx.TransactionType} would take the raw path — use submitAndWait.`,
      )
    }
    const { subPath, body } = txToNativeSubmit(tx)
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
    return this.tracker.toResult(final)
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
    const { meta } = response.result
    const engineResult =
      meta !== undefined && typeof meta !== 'string'
        ? meta.TransactionResult
        : undefined
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
