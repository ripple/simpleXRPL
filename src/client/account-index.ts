import type { Account, Custodian } from '../domain/index.js'
import {
  AmbiguousAccountError,
  DuplicateSignerError,
  NetworkMismatchError,
} from '../errors.js'

/**
 * Reject two signers bound to the same backend tenant — the same `kind` and
 * the same defined `tenantId` (§3.1). Signers without a `tenantId` (e.g. local
 * wallet holders) have no tenant to collide on, so any number may coexist.
 *
 * @param signers - The registered custodians.
 * @throws {@link DuplicateSignerError} if two signers share a kind and tenant id.
 */
export function assertDistinctTenants(signers: readonly Custodian[]): void {
  const seen = new Set<string>()
  for (const signer of signers) {
    if (signer.tenantId !== undefined) {
      const key = `${signer.kind}:${signer.tenantId}`
      if (seen.has(key)) {
        throw new DuplicateSignerError(signer.kind, signer.tenantId)
      }
      seen.add(key)
    }
  }
}

/**
 * Choose the single account record to bind for one r-address, given the network
 * the client is connected to. All candidates here belong to one custodian (a
 * cross-custodian collision is rejected earlier); they differ only by the XRPL
 * network their record is scoped to — the case where Ripple Custody registers
 * the same address on several ledgers (mainnet, testnet, …).
 *
 * - Client network known: prefer the record on that exact network, else a
 *   network-agnostic record (one that works on any network). No match returns
 *   `undefined` so the address is left unbound rather than mis-routed.
 * - Client network unknown (a single record, or the network probe failed): a
 *   lone or network-agnostic record is unambiguous and is returned; several
 *   network-scoped records cannot be told apart, so the address is left unbound.
 *
 * @param candidates - The records discovered for one r-address, one custodian.
 * @param clientNetworkId - The network id the client is connected to, if known.
 * @returns The record to bind, or `undefined` to leave the address unbound.
 */
function selectForNetwork(
  candidates: readonly Account[],
  clientNetworkId: number | undefined,
): Account | undefined {
  if (clientNetworkId !== undefined) {
    return (
      candidates.find((record) => record.networkId === clientNetworkId) ??
      candidates.find((record) => record.networkId === undefined)
    )
  }
  const scoped = candidates.filter((record) => record.networkId !== undefined)
  return scoped.length <= 1 ? candidates[0] : undefined
}

/**
 * Group every discovered account by r-address, preserving the owning custodian.
 *
 * @param discovered - Each custodian paired with the accounts it discovered.
 * @returns A map from r-address to the records claiming it.
 */
function groupByAddress(
  discovered: ReadonlyArray<{ accounts: readonly Account[] }>,
): Map<string, Account[]> {
  const byAddress = new Map<string, Account[]>()
  for (const { accounts } of discovered) {
    for (const account of accounts) {
      const list = byAddress.get(account.address)
      if (list === undefined) {
        byAddress.set(account.address, [account])
      } else {
        list.push(account)
      }
    }
  }
  return byAddress
}

/** The already-computed state a primary-address check reads. */
interface BoundState {
  /** Every discovered record, grouped by r-address. */
  readonly byAddress: ReadonlyMap<string, readonly Account[]>
  /** The bound index built so far. */
  readonly index: ReadonlyMap<string, Account>
  /** The network id the client is connected to, if known. */
  readonly clientNetworkId: number | undefined
}

/**
 * A configured signer whose primary address was discovered, but only on XRPL
 * networks other than the one the client is connected to, is a hard error — the
 * caller pointed the client at the wrong network and a transaction would be
 * silently stranded. An address that was never discovered, or that resolved to
 * a bound record, is left to normal lookup.
 *
 * @param custodian - The signer whose primary address is checked.
 * @param state - The grouped records, bound index, and connected network id.
 * @throws {@link NetworkMismatchError} if the primary exists only on other networks.
 */
function assertPrimaryOnNetwork(custodian: Custodian, state: BoundState): void {
  const address = custodian.primary.address
  if (state.index.has(address)) {
    return
  }
  const available = Array.from(
    new Set(
      (state.byAddress.get(address) ?? [])
        .map((record) => record.networkId)
        .filter((id): id is number => id !== undefined),
    ),
  )
  if (available.length > 0) {
    throw new NetworkMismatchError(address, state.clientNetworkId, available)
  }
}

/**
 * Build the client-side address to account index by discovering every
 * custodian's accounts. The same r-address appearing under two custodians is
 * rejected so dispatch can always resolve a single owning custodian.
 *
 * When any discovered record is network-scoped (Ripple Custody registers one
 * address on several ledgers), the client's connected network — resolved lazily
 * via `resolveNetworkId`, and only then — decides which record to bind, so an
 * intent is never routed to the wrong network's registration.
 *
 * Note: a tenant/domain-level duplicate-signer check is not performed here — the
 * custodian model does not yet expose tenancy; only r-address collisions are
 * validated today.
 *
 * @param signers - The registered custodians.
 * @param resolveNetworkId - Resolves the connected network's id, invoked only
 *   when some record is network-scoped; resolves `undefined` if it can't be
 *   determined.
 * @returns The bound index and the resolved network id (`undefined` when no
 *   record was network-scoped, so no resolution was attempted).
 * @throws {@link AmbiguousAccountError} if an r-address is claimed by two custodians.
 * @throws {@link NetworkMismatchError} if a signer's primary exists only on other networks.
 */
export async function buildAccountIndex(
  signers: readonly Custodian[],
  resolveNetworkId: () => Promise<number | undefined>,
): Promise<{ index: Map<string, Account>; networkId: number | undefined }> {
  const discovered = await Promise.all(
    signers.map(async (custodian) => ({
      custodian,
      accounts: await custodian.listAccounts(),
    })),
  )

  const byAddress = groupByAddress(discovered)

  // Only pay for a network round-trip when a record actually depends on it.
  const networkScoped = Array.from(byAddress.values()).some((list) =>
    list.some((record) => record.networkId !== undefined),
  )
  const networkId = networkScoped ? await resolveNetworkId() : undefined

  const index = new Map<string, Account>()
  for (const [address, candidates] of byAddress) {
    const owners = new Set(candidates.map((record) => record.signer))
    if (owners.size > 1) {
      throw new AmbiguousAccountError(
        address,
        Array.from(owners, (signer) => signer.kind),
      )
    }
    const chosen = selectForNetwork(candidates, networkId)
    if (chosen !== undefined) {
      index.set(address, chosen)
    }
  }

  for (const { custodian } of discovered) {
    assertPrimaryOnNetwork(custodian, {
      byAddress,
      index,
      clientNetworkId: networkId,
    })
  }

  return { index, networkId }
}
