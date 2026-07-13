import type { Account, AccountSelector, Custodian } from '../domain/index.js'
import {
  AccountNotFoundError,
  NoSignerError,
  SimpleXRPLError,
} from '../errors.js'
import { XrplLedger } from '../ledger/index.js'
import type { SubmissionHost } from '../pipeline/index.js'
import type { LedgerPort } from '../ports/index.js'
import { Token, XRP } from '../verticals/index.js'

import { buildAccountIndex } from './account-index.js'
import type { SimpleXRPLConfig } from './config.js'

/** The network a client is bound to. */
export interface NetworkInfo {
  /** The rippled endpoint (`ws(s)://` or `http(s)://`). */
  readonly rippledUrl: string

  /** Faucet endpoint, used on test networks only. */
  readonly faucetUrl?: string
}

/**
 * The runtime client. Binds a set of pre-constructed custodians to a network,
 * flattens their discovered accounts into a single address to custodian index,
 * and resolves the account a verb acts on. Constructed only via
 * {@link SimpleXRPLClient.init} (or `SimpleXRPL.init`), never with `new`.
 *
 * A client with no signers is fully usable for reads; every write path resolves
 * its custodian through the acted-on account at call time.
 */
export class SimpleXRPLClient implements SubmissionHost {
  /** The network this client is bound to. */
  public readonly network: NetworkInfo

  /** The registered custodians (0..N). */
  public readonly signers: readonly Custodian[]

  /** The default signer, used when a verb is called without an explicit account. */
  public readonly primarySigner: Custodian | undefined

  /** Native-XRP value transfers. */
  public readonly xrp: XRP

  /** Multi-Purpose Token (MPT) family and DEX offers. */
  public readonly token: Token

  /** Address to account index, rebuilt by {@link SimpleXRPLClient.refreshAccounts}. */
  private accountIndex: Map<string, Account>

  /** Lazily created from `network.rippledUrl` when not injected. */
  private ledgerInstance: LedgerPort | undefined

  private constructor(state: {
    network: NetworkInfo
    signers: readonly Custodian[]
    primarySigner: Custodian | undefined
    accountIndex: Map<string, Account>
    ledger: LedgerPort | undefined
  }) {
    this.network = state.network
    this.signers = state.signers
    this.primarySigner = state.primarySigner
    this.accountIndex = state.accountIndex
    this.ledgerInstance = state.ledger
    this.xrp = new XRP(this)
    this.token = new Token(this)
  }

  /**
   * All discovered accounts, keyed by r-address.
   *
   * @returns The address to account index.
   */
  public get accounts(): ReadonlyMap<string, Account> {
    return this.accountIndex
  }

  /**
   * The ledger connection for reads, autofill, and Local/raw submission.
   * Created lazily from `network.rippledUrl` when none was injected.
   *
   * @returns The ledger port.
   */
  public get ledger(): LedgerPort {
    this.ledgerInstance ??= new XrplLedger(this.network.rippledUrl)
    return this.ledgerInstance
  }

  /**
   * Bind custodians to a network and discover their accounts. The only entry
   * point; the runtime client is never constructed via `new`.
   *
   * @param config - Network endpoints and pre-constructed custodians.
   * @returns A ready client.
   * @throws {@link AmbiguousAccountError} if an r-address is claimed by two custodians.
   */
  public static async init(
    config: SimpleXRPLConfig,
  ): Promise<SimpleXRPLClient> {
    const signers = config.signers ?? []
    const primarySigner = SimpleXRPLClient.resolvePrimary(
      signers,
      config.primarySigner,
    )
    const accountIndex = await buildAccountIndex(signers)
    return new SimpleXRPLClient({
      network: { rippledUrl: config.rippledUrl, faucetUrl: config.faucetUrl },
      signers,
      primarySigner,
      accountIndex,
      ledger: config.ledger,
    })
  }

  /**
   * Pick the primary signer: the explicit one (which must be registered) or the
   * first signer, or `undefined` in no-signer mode.
   *
   * @param signers - The registered custodians.
   * @param explicit - An explicitly requested primary signer, if any.
   * @returns The resolved primary signer.
   * @throws {@link SimpleXRPLError} if `explicit` is not among `signers`.
   */
  private static resolvePrimary(
    signers: readonly Custodian[],
    explicit: Custodian | undefined,
  ): Custodian | undefined {
    if (explicit !== undefined && !signers.includes(explicit)) {
      throw new SimpleXRPLError(
        'primarySigner must be one of the configured signers',
      )
    }
    return explicit ?? signers[0]
  }

  /**
   * Re-discover every custodian's accounts and rebuild the index. New accounts
   * become addressable; accounts removed upstream are gone on next lookup.
   *
   * @throws {@link AmbiguousAccountError} if an r-address is claimed by two custodians.
   */
  public async refreshAccounts(): Promise<void> {
    this.accountIndex = await buildAccountIndex(this.signers)
  }

  /**
   * Resolve the account a verb acts on. With no selector, uses the primary
   * signer's primary account.
   *
   * @param selector - An address, an explicit address, or a signer/account pair.
   * @returns The resolved account.
   * @throws {@link NoSignerError} if no selector is given and no signer is configured.
   * @throws {@link AccountNotFoundError} if the address is not registered, or the
   *   explicit `{ signer, account }` account is not one the signer owns.
   */
  public resolveAccount(selector?: AccountSelector): Account {
    if (selector === undefined) {
      return this.lookup(this.requireSigner().primary.address)
    }
    if (typeof selector === 'string') {
      return this.lookup(selector)
    }
    if ('address' in selector) {
      return this.lookup(selector.address)
    }
    // { signer, account? }: default to the signer's primary; an explicitly
    // named account must be one the signer actually owns.
    if (selector.account === undefined) {
      return this.lookup(selector.signer.primary.address)
    }
    const account = this.lookup(selector.account)
    if (account.signer !== selector.signer) {
      throw new AccountNotFoundError(selector.account)
    }
    return account
  }

  /**
   * Return the primary signer, or throw if the client has none.
   *
   * @returns The primary signer.
   * @throws {@link NoSignerError} if no signer is configured.
   */
  public requireSigner(): Custodian {
    if (this.primarySigner === undefined) {
      throw new NoSignerError(
        'No signer configured. Pass `signers` to init, or an explicit account to the verb.',
      )
    }
    return this.primarySigner
  }

  /** Open the ledger connection (no-op for a ledger that manages its own). */
  public async connect(): Promise<void> {
    await this.ledger.connect?.()
  }

  /** Close the ledger connection (no-op for a ledger that manages its own). */
  public async disconnect(): Promise<void> {
    await this.ledger.disconnect?.()
  }

  /**
   * Look up an account by r-address.
   *
   * @param address - The r-address to resolve.
   * @returns The registered account.
   * @throws {@link AccountNotFoundError} if the address is not registered.
   */
  private lookup(address: string): Account {
    const account = this.accountIndex.get(address)
    if (account === undefined) {
      throw new AccountNotFoundError(address)
    }
    return account
  }
}
