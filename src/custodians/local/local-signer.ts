import { Wallet } from 'xrpl'
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
  RippledSubmitError,
  SimpleXRPLError,
} from '../../errors.js'

/** Options for {@link LocalSigner.create}. */
export interface LocalSignerCreateOptions {
  /** The wallets this signer holds (at least one). */
  readonly wallets: readonly Wallet[]

  /** The primary account's r-address. Defaults to the first wallet. */
  readonly primary?: string
}

/** Options for {@link LocalSigner.fromEnv}. */
export interface LocalSignerFromEnvOptions {
  /** The primary account's r-address. Defaults to the first seed in scan order. */
  readonly primary?: string

  /** Environment source to scan. Defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>
}

/** Matches `XRPL_<NAME>_SEED` (and plain `XRPL_SEED`) environment variables. */
const SEED_ENV_PATTERN = /^XRPL_.+_SEED$/u

/**
 * A local signing backend that holds one or more `xrpl` wallets and signs
 * transactions in-process. Local is intended for development and utility
 * accounts; production accounts should use a governed custodian.
 *
 * Seed and mnemonic sourcing is the caller's responsibility. (Mnemonic
 * construction is intentionally omitted — the underlying `xrpl` helper is
 * deprecated.)
 */
export class LocalSigner implements Custodian {
  /** This custodian signs locally. */
  public readonly kind: CustodianKind = 'local'

  /** Wallets held by this signer, keyed by classic r-address. */
  private readonly wallets: Map<string, Wallet>

  /** The primary account's r-address. */
  private readonly primaryAddress: string

  private constructor(wallets: Map<string, Wallet>, primaryAddress: string) {
    this.wallets = wallets
    this.primaryAddress = primaryAddress
  }

  /**
   * The primary account this signer owns.
   *
   * @returns The primary account reference.
   */
  public get primary(): AccountRef {
    return { address: this.primaryAddress }
  }

  /**
   * Build a signer from a single seed.
   *
   * @param seed - The wallet seed (the caller's responsibility to source).
   * @returns A signer holding the one derived wallet.
   */
  public static fromSeed(seed: string): LocalSigner {
    return LocalSigner.create({ wallets: [Wallet.fromSeed(seed)] })
  }

  /**
   * Build a signer from pre-constructed wallets.
   *
   * @param options - The wallets and optional primary r-address.
   * @returns A signer holding the given wallets.
   * @throws {@link SimpleXRPLError} if no wallets are given, or `primary` is not among them.
   */
  public static create(options: LocalSignerCreateOptions): LocalSigner {
    const { wallets, primary } = options
    if (wallets.length === 0) {
      throw new SimpleXRPLError(
        'LocalSigner.create requires at least one wallet',
      )
    }
    const index = new Map<string, Wallet>()
    for (const wallet of wallets) {
      index.set(wallet.classicAddress, wallet)
    }
    return new LocalSigner(
      index,
      LocalSigner.resolvePrimary(index, wallets[0].classicAddress, primary),
    )
  }

  /**
   * Build a signer from `XRPL_*_SEED` environment variables (one wallet per
   * seed). The primary defaults to the first seed in scan order.
   *
   * @param options - Optional primary r-address and environment source.
   * @returns A signer holding one wallet per discovered seed.
   * @throws {@link SimpleXRPLError} if no matching seed variables are found.
   */
  public static fromEnv(options?: LocalSignerFromEnvOptions): LocalSigner {
    // eslint-disable-next-line n/no-process-env -- fromEnv reads seeds from the environment by design.
    const env = options?.env ?? process.env
    const seeds = LocalSigner.collectSeeds(env)
    if (seeds.length === 0) {
      throw new SimpleXRPLError(
        'No XRPL_*_SEED environment variables found for LocalSigner.fromEnv',
      )
    }
    return LocalSigner.create({
      wallets: seeds.map((seed) => Wallet.fromSeed(seed)),
      primary: options?.primary,
    })
  }

  private static resolvePrimary(
    index: ReadonlyMap<string, Wallet>,
    fallback: string,
    primary: string | undefined,
  ): string {
    if (primary === undefined) {
      return fallback
    }
    if (!index.has(primary)) {
      throw new SimpleXRPLError('primary must be one of the provided wallets')
    }
    return primary
  }

  private static collectSeeds(
    env: Readonly<Record<string, string | undefined>>,
  ): string[] {
    const seeds: string[] = []
    for (const key of Object.keys(env)) {
      const value = env[key]
      const matches = key === 'XRPL_SEED' || SEED_ENV_PATTERN.test(key)
      if (matches && value !== undefined && value !== '') {
        seeds.push(value)
      }
    }
    return seeds
  }

  /**
   * Local raw-signs every transactor, so nothing is a "native" operation and the
   * raw path is always available.
   *
   * @returns Capabilities allowing any transactor via raw signing.
   */
  // eslint-disable-next-line class-methods-use-this -- Implements the stateless Custodian.capabilities contract.
  public capabilities(): SignerCapabilities {
    return { nativeOps: new Set(), allowRaw: true }
  }

  /**
   * List the accounts this signer holds.
   *
   * @returns One account per wallet, keyed by r-address.
   */
  public async listAccounts(): Promise<Account[]> {
    return Array.from(this.wallets.keys(), (address) => ({
      address,
      signer: this,
    }))
  }

  /**
   * Sign a transaction with the wallet for the context's account.
   *
   * @param tx - The transaction to sign (network fields already resolved).
   * @param ctx - The submission context naming the source account.
   * @returns The signed envelope (blob + hash).
   * @throws {@link AccountNotFoundError} if no wallet owns the context account.
   */
  public async sign(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SignedEnvelope> {
    const signed = this.walletFor(ctx.account.address).sign(tx)
    return { txBlob: signed.tx_blob, hash: signed.hash }
  }

  /**
   * Sign the transaction locally, submit it through the shared ledger, and wait
   * for a terminal result.
   *
   * @param tx - The autofilled transaction to submit.
   * @param ctx - The submission context (source account + shared ledger).
   * @returns The rippled-sourced submission result.
   * @throws {@link RippledSubmitError} if the transaction reaches a terminal
   *   failure (a non-`tesSUCCESS` engine result).
   */
  public async submitAndWait(
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
   * Submit asynchronously. The async handle model is provided by later work.
   *
   * @returns Never; rejects until async submission is wired.
   * @throws {@link SimpleXRPLError} always, at this layer.
   */
  // eslint-disable-next-line class-methods-use-this -- Placeholder until async submission is wired.
  public async submitAsync(): Promise<SubmissionHandle> {
    throw new SimpleXRPLError('Async submission is not yet implemented')
  }

  private walletFor(address: string): Wallet {
    const wallet = this.wallets.get(address)
    if (wallet === undefined) {
      throw new AccountNotFoundError(address)
    }
    return wallet
  }
}
