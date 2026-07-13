import type { Account, AccountSelector, Custodian } from '../domain/index.js'
import {
  AccountNotFoundError,
  NoSignerError,
  SimpleXRPLError,
} from '../errors.js'

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
export class SimpleXRPLClient {
  /** The network this client is bound to. */
  public readonly network: NetworkInfo

  /** The registered custodians (0..N). */
  public readonly signers: readonly Custodian[]

  /** The default signer, used when a verb is called without an explicit account. */
  public readonly primarySigner: Custodian | undefined

  /** Address to account index, rebuilt by {@link SimpleXRPLClient.refreshAccounts}. */
  private accountIndex: Map<string, Account>

  private constructor(state: {
    network: NetworkInfo
    signers: readonly Custodian[]
    primarySigner: Custodian | undefined
    accountIndex: Map<string, Account>
  }) {
    this.network = state.network
    this.signers = state.signers
    this.primarySigner = state.primarySigner
    this.accountIndex = state.accountIndex
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
