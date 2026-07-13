import type { Account, Custodian } from '../domain/index.js'
import { AmbiguousAccountError } from '../errors.js'

/**
 * Merge one custodian's discovered accounts into the shared index, rejecting a
 * r-address that a different custodian already claims.
 *
 * @param index - The address to account index being built.
 * @param custodian - The custodian whose accounts are being added.
 * @param accounts - The accounts discovered by `custodian`.
 * @throws {@link AmbiguousAccountError} if an r-address is claimed by two custodians.
 */
function addAccounts(
  index: Map<string, Account>,
  custodian: Custodian,
  accounts: readonly Account[],
): void {
  for (const account of accounts) {
    const existing = index.get(account.address)
    if (existing !== undefined && existing.signer !== custodian) {
      throw new AmbiguousAccountError(account.address, [
        existing.signer.kind,
        custodian.kind,
      ])
    }
    index.set(account.address, account)
  }
}

/**
 * Build the client-side address to account index by discovering every
 * custodian's accounts. The same r-address appearing under two custodians is
 * rejected so dispatch can always resolve a single owning custodian.
 *
 * Note: a tenant/domain-level duplicate-signer check is not performed here — the
 * custodian model does not yet expose tenancy; only r-address collisions are
 * validated today.
 *
 * @param signers - The registered custodians.
 * @returns A map from r-address to the owning {@link Account}.
 * @throws {@link AmbiguousAccountError} if an r-address is claimed by two custodians.
 */
export async function buildAccountIndex(
  signers: readonly Custodian[],
): Promise<Map<string, Account>> {
  const discovered = await Promise.all(
    signers.map(async (custodian) => ({
      custodian,
      accounts: await custodian.listAccounts(),
    })),
  )
  const index = new Map<string, Account>()
  for (const { custodian, accounts } of discovered) {
    addAccounts(index, custodian, accounts)
  }
  return index
}
