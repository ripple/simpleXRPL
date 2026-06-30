import type { Account, AccountRef } from '../../../core/account.js'
import { AccountNotFoundError } from '../../../core/errors.js'

/**
 * Resolved Custody context for an account — the fields an intent envelope needs
 * to name the sending account (TDD §5.3).
 */
export interface CustodyAccountContext {
  /** The XRPL r-address. */
  address: string
  /** The Custody account UUID (`custodianRef`). */
  accountId: string
}

/**
 * In-memory index over a custodian's discovered accounts. Resolves an
 * {@link AccountRef} (r-address or alias) to its Custody context, and validates
 * the configured primary at construction (TDD §3.3, §5.2).
 */
export class AccountContext {
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
   * Resolve an account reference to its Custody context.
   *
   * @param ref - An r-address, alias, or `{ address | alias }`.
   * @returns The resolved address + Custody account UUID.
   * @throws {@link AccountNotFoundError} if it cannot be resolved, or the
   * account has no Custody id.
   */
  public resolve(ref: AccountRef): CustodyAccountContext {
    const account = this.lookup(ref)
    if (account === undefined) {
      throw new AccountNotFoundError(describeRef(ref))
    }
    if (typeof account.custodianRef !== 'string') {
      throw new AccountNotFoundError(account.address)
    }
    return { address: account.address, accountId: account.custodianRef }
  }

  /**
   * Find the account for a reference without throwing.
   *
   * @param ref - The account reference to look up.
   * @returns The matching account, or `undefined`.
   */
  private lookup(ref: AccountRef): Account | undefined {
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
function describeRef(ref: AccountRef): string {
  if (typeof ref === 'string') {
    return ref
  }
  return ref.address ?? ref.alias ?? '<empty account reference>'
}
