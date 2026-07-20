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
  IntentPendingError,
  RippledSubmitError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../errors.js'
import type { components } from '../../generated/palisade.js'

import { PalisadeAuthService } from './auth/palisade-auth.service.js'
import type { PalisadeCustodyConfig } from './config.js'
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

type PalisadeTransaction = components['schemas']['transactionsv2Transaction']
type GetTransactionResponse =
  components['schemas']['transactionsv2GetTransactionResponse']

const DEFAULT_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 1500
const TERMINAL_SUCCESS = 'CONFIRMED'
const TERMINAL_FAILURE: ReadonlySet<string> = new Set(['REJECTED', 'FAILED'])

/**
 * The Palisade custodian: signs and submits through Palisade's vault/wallet API.
 * A transactor Palisade models natively uses its `Submit*`/transfer op; anything
 * else falls back to the raw sign-only path (`allowRawSigning`) and is submitted
 * through the shared ledger. Async submission is deferred to a later milestone.
 */
export class PalisadeCustody implements Custodian {
  public readonly kind: CustodianKind = 'palisade-custody'

  /** The Palisade API client identity — the tenant two instances collide on. */
  public readonly tenantId: string

  private readonly client: PalisadeHttpClient
  private readonly allowRaw: boolean
  private readonly timeoutMs: number
  private context: PalisadeWalletContext
  private primaryAccount: Account | undefined

  private constructor(
    client: PalisadeHttpClient,
    options: { allowRaw: boolean; timeoutMs: number; tenantId: string },
  ) {
    this.client = client
    this.allowRaw = options.allowRaw
    this.timeoutMs = options.timeoutMs
    this.tenantId = options.tenantId
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
    const auth = new PalisadeAuthService({
      authPort: new HttpPalisadeAuthPort({ baseUrl: config.baseUrl, http }),
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      now: config.now,
    })
    const client = new PalisadeHttpClient({
      baseUrl: config.baseUrl,
      http,
      auth,
    })
    const custodian = new PalisadeCustody(client, {
      allowRaw: config.allowRawSigning ?? false,
      timeoutMs: config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
      tenantId: config.clientId,
    })
    const accounts = await discoverXrplWallets(client, custodian)
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
   * Async submission is provided by a later milestone (governance/await).
   *
   * @returns Never; rejects until async submission is wired.
   * @throws {@link SimpleXRPLError} always, at this layer.
   */
  // eslint-disable-next-line class-methods-use-this -- placeholder until async submission lands
  public async submitAsync(): Promise<SubmissionHandle> {
    throw new SimpleXRPLError(
      'Palisade async submission is not yet implemented',
    )
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
    const ref = this.walletRef(ctx.account)
    const base = `/v2/vaults/${ref.vaultId}/wallets/${ref.walletId}/transactions`
    const submitted = await this.client.post<PalisadeTransaction>(
      `${base}/${subPath}`,
      body,
    )
    const final = await this.pollUntilTerminal(base, submitted, ctx.timeoutMs)
    return {
      source: 'palisade',
      response: final,
      intent: undefined,
      intentId: final.id,
      txHash: final.hash,
    }
  }

  /**
   * Raw-sign then submit through the shared ledger and wait for `tesSUCCESS`.
   *
   * @param tx - The transaction to submit.
   * @param ctx - The submission context.
   * @returns The rippled-sourced submission result.
   * @throws {@link RippledSubmitError} on a non-`tesSUCCESS` engine result.
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
      throw new RippledSubmitError(engineResult, response)
    }
    return {
      source: 'rippled',
      response,
      intent: undefined,
      txHash: response.result.hash,
    }
  }

  /**
   * Poll a submitted transaction until it reaches a terminal status.
   *
   * @param base - The wallet-relative transactions base path.
   * @param submitted - The initial submit response.
   * @param timeoutMs - Optional per-call timeout override.
   * @returns The terminal transaction.
   * @throws {@link SignerCapabilityError} never; {@link IntentPendingError} on timeout.
   */
  private async pollUntilTerminal(
    base: string,
    submitted: PalisadeTransaction,
    timeoutMs?: number,
  ): Promise<PalisadeTransaction> {
    const attempts = Math.max(
      1,
      Math.ceil((timeoutMs ?? this.timeoutMs) / POLL_INTERVAL_MS),
    )
    let current = submitted
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (current.status === TERMINAL_SUCCESS) {
        return current
      }
      if (TERMINAL_FAILURE.has(current.status)) {
        throw new SimpleXRPLError(
          `Palisade transaction ${current.id} ${current.status}`,
        )
      }
      if (attempt + 1 < attempts) {
        // eslint-disable-next-line no-await-in-loop -- sequential poll by design
        await new Promise((resolve) => {
          setTimeout(resolve, POLL_INTERVAL_MS)
        })
        // eslint-disable-next-line no-await-in-loop -- sequential poll by design
        const next = await this.client.get<GetTransactionResponse>(
          `${base}/${current.id}`,
        )
        current = next.transaction ?? current
      }
    }
    throw new IntentPendingError(current.id, 'palisade-custody', current.status)
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
