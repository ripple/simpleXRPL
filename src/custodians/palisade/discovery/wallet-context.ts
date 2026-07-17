import type { Account } from '../../../domain/index.js'
import { AccountNotFoundError } from '../../../errors.js'

/**
 * How a caller may refer to a discovered account when resolving Palisade
 * context: an r-address, an alias, or an explicit `{ address | alias }`.
 * Distinct from the domain model's `AccountSelector` (client-level account
 * resolution), which has no alias variant — this is Palisade-adapter-internal.
 */
export type WalletLookup = string | { address?: string; alias?: string }

/**
 * Resolved Palisade context for an account — the fields a native operation
 * needs to name the sending wallet (TDD §5.3).
 */
export interface PalisadeWalletContextEntry {
  /** The XRPL r-address. */
  address: string
  /** The Palisade vault id. */
  vaultId: string
  /** The Palisade wallet id. */
  walletId: string
}

/**
 * In-memory index over a custodian's discovered wallets. Resolves an
 * {@link WalletLookup} (r-address or alias) to its Palisade context, and
 * validates the configured primary at construction (TDD §3.4, §5.2).
 *
 * A Palisade-specific sibling of the Ripple adapter's `AccountContext`: the
 * resolution logic is the same shape, but `resolve()` expects the Palisade
 * `{ vaultId, walletId }` custodian ref rather than Custody's account UUID
 * string, so it isn't reusable as-is across adapters.
 */
export class PalisadeWalletContext {
  private readonly byAddress = new Map<string, Account>()
  private readonly byAlias = new Map<string, Account>()

  /**
   * Build the index from a discovered account list.
   *
   * @param accounts - The accounts discovered for this custodian.
   */
  public constructor(accounts: readonly Account[]) {
    for (const account of accounts) {
      this.byAddress.set(account.address, account)
      if (account.alias !== undefined && account.alias !== '') {
        this.byAlias.set(account.alias, account)
      }
    }
  }

  /**
   * List the indexed accounts.
   *
   * @returns All indexed accounts, keyed by r-address.
   */
  public list(): Account[] {
    return Array.from(this.byAddress.values())
  }

  /**
   * Validate that a configured primary r-address was actually discovered.
   *
   * @param primary - The primary r-address from config.
   * @throws {@link AccountNotFoundError} if it is not in the discovered set.
   */
  public validatePrimary(primary: string): void {
    if (!this.byAddress.has(primary)) {
      throw new AccountNotFoundError(primary)
    }
  }

  /**
   * Resolve an account reference to its Palisade context.
   *
   * @param ref - An r-address, alias, or `{ address | alias }`.
   * @returns The resolved address + vault/wallet ids.
   * @throws {@link AccountNotFoundError} if it cannot be resolved, or the
   * account has no Palisade vault/wallet ref.
   */
  public resolve(ref: WalletLookup): PalisadeWalletContextEntry {
    const account = this.lookup(ref)
    if (account === undefined) {
      throw new AccountNotFoundError(describeRef(ref))
    }
    if (typeof account.custodianRef !== 'object') {
      throw new AccountNotFoundError(account.address)
    }
    return {
      address: account.address,
      vaultId: account.custodianRef.vaultId,
      walletId: account.custodianRef.walletId,
    }
  }

  /**
   * Find the account for a reference without throwing.
   *
   * @param ref - The account reference to look up.
   * @returns The matching account, or `undefined`.
   */
  private lookup(ref: WalletLookup): Account | undefined {
    if (typeof ref === 'string') {
      return this.byAddress.get(ref) ?? this.byAlias.get(ref)
    }
    if (ref.address !== undefined) {
      return this.byAddress.get(ref.address)
    }
    if (ref.alias !== undefined) {
      return this.byAlias.get(ref.alias)
    }
    return undefined
  }
}

/**
 * Render an account reference for an error message.
 *
 * @param ref - The account reference.
 * @returns A human-readable string for the reference.
 */
function describeRef(ref: WalletLookup): string {
  if (typeof ref === 'string') {
    return ref
  }
  return ref.address ?? ref.alias ?? '<empty account reference>'
}
