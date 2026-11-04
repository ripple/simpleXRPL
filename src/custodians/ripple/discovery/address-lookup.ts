import { CUSTODY_ROUTES } from '../../../generated/custody-routes.js'
import type { components } from '../../../generated/custody.js'
import { collectPages } from '../pagination.js'
import type { CursorPage } from '../pagination.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

/** A Custody account's address: which domain, account, and ledger it is on. */
export type CustodyAddressReference =
  components['schemas']['Core_AccountAddressReference']

/** Options for `CustodyApi.findByAddress`. */
export interface CustodyFindByAddressOptions {
  /** Only match the address on this ledger, e.g. `xrpl-testnet`. */
  readonly ledgerId?: string
  /** Only match the address in this domain. */
  readonly domainId?: string
}

/**
 * Every Custody account address equal to `address`, across all the domains
 * the API user can see (`GET /v1/addresses`).
 *
 * Every page is read: the endpoint filters on the address only, so other
 * kinds of reference to it share the collection and could push an account
 * match off the first page. Only account references for exactly `address`
 * are kept.
 *
 * @param client - The authenticated Custody client.
 * @param address - The address to look up, e.g. an XRPL r-address.
 * @returns The matching account addresses.
 */
export async function findAddressReferences(
  client: CustodyHttpClient,
  address: string,
): Promise<CustodyAddressReference[]> {
  const route = CUSTODY_ROUTES.getAllDomainsAddresses
  const references = await collectPages(async (startingAfter) =>
    // The spec doesn't declare `startingAfter` here, but the response carries
    // a cursor and Custody honours it.
    client.invoke<CursorPage<{ readonly type: string }>>(
      route.method,
      route.path,
      { query: { address, startingAfter } },
    ),
  )
  return references.filter(
    (reference): reference is CustodyAddressReference =>
      reference.type === 'AccountAddressReference' &&
      'address' in reference &&
      reference.address === address,
  )
}

/**
 * Explain why several account addresses match, and how to pick one.
 *
 * @param address - The address looked up.
 * @param matches - The account addresses holding it (two or more).
 * @returns The error message.
 */
export function ambiguousAddressMessage(
  address: string,
  matches: readonly CustodyAddressReference[],
): string {
  const [first] = matches
  const sameAccount = matches.every(
    (match) =>
      match.domainId === first.domainId && match.accountId === first.accountId,
  )
  if (sameAccount) {
    const ledgers = matches.map((match) => match.ledgerId).join(', ')
    return (
      `Custody account ${first.accountId} in domain ${first.domainId} holds ` +
      `${address} on ${matches.length} ledgers (${ledgers}); pass ledgerId to pick one`
    )
  }
  const accounts = matches
    .map(
      (match) =>
        `account ${match.accountId} in domain ${match.domainId} on ledger ${match.ledgerId}`,
    )
    .join('; ')
  return (
    `${matches.length} Custody accounts hold ${address} (${accounts}); ` +
    'pass ledgerId and/or domainId to pick one'
  )
}
