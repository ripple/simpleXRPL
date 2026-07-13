import type { Account, Custodian } from '../../../domain/index.js'
import type { operations } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

/** Custody's max page size for collection endpoints. */
const PAGE_LIMIT = 100

/* eslint-disable @typescript-eslint/no-magic-numbers -- 200 indexes the OpenAPI success-response type. */
type SuccessJson<
  Op extends {
    responses: { 200: { content: { 'application/json': unknown } } }
  },
> = Op['responses'][200]['content']['application/json']
/* eslint-enable @typescript-eslint/no-magic-numbers */

type LedgersResponse = SuccessJson<operations['getLedgers']>
type AccountsResponse = SuccessJson<operations['getAccounts']>
type AddressesResponse = SuccessJson<operations['getAddresses']>

/** A Custody collection page: a list of items plus an optional next cursor. */
interface Page<T> {
  items: T[]
  nextStartingAfter?: string
}

/**
 * Walk every page of a cursor-paginated Custody collection.
 *
 * @param fetchPage - Fetches one page given an optional `startingAfter` cursor.
 * @returns All items across all pages.
 */
async function collectPages<T>(
  fetchPage: (startingAfter?: string) => Promise<Page<T>>,
): Promise<T[]> {
  const all: T[] = []
  let cursor: string | undefined
  do {
    // Sequential by design: each page's cursor depends on the previous response.
    // eslint-disable-next-line no-await-in-loop -- Cursor pagination is inherently sequential.
    const page = await fetchPage(cursor)
    all.push(...page.items)
    cursor = page.nextStartingAfter
  } while (cursor !== undefined && cursor !== '')
  return all
}

/**
 * Resolve which ledger ids in this Custody environment are XRPL ledgers, by
 * matching the ledger-parameters discriminator (`type === 'XRPL'`). Avoids
 * hardcoding an environment-specific id.
 *
 * @param client - The authenticated Custody client.
 * @returns The set of XRPL ledger ids.
 */
async function resolveXrplLedgerIds(
  client: CustodyHttpClient,
): Promise<Set<string>> {
  const ledgers = await collectPages(async (startingAfter) =>
    client.get<LedgersResponse>('/v1/ledgers', {
      limit: PAGE_LIMIT,
      startingAfter,
    }),
  )
  const ids = new Set<string>()
  for (const ledger of ledgers) {
    if (ledger.data.parameters.type === 'XRPL') {
      ids.add(ledger.data.id)
    }
  }
  return ids
}

/** Inputs for listing one account's external XRPL addresses. */
interface AddressLookup {
  client: CustodyHttpClient
  domainId: string
  accountId: string
  xrplLedgerIds: Set<string>
}

/**
 * List the external XRPL addresses of one Custody account.
 *
 * @param lookup - The client, domain, account, and XRPL ledger ids.
 * @returns The external r-addresses for the account.
 */
async function listExternalAddresses(lookup: AddressLookup): Promise<string[]> {
  const { client, domainId, accountId, xrplLedgerIds } = lookup
  const path = `/v1/domains/${domainId}/accounts/${accountId}/addresses`
  const addresses = await collectPages(async (startingAfter) =>
    client.get<AddressesResponse>(path, { limit: PAGE_LIMIT, startingAfter }),
  )
  return addresses
    .map((entry) => entry.data)
    .filter(
      (data) => data.scope === 'External' && xrplLedgerIds.has(data.ledgerId),
    )
    .map((data) => data.address)
}

/**
 * Discover a Custody domain's XRPL accounts as SDK {@link Account}s, keyed by
 * r-address (TDD §9.2). Two-tier: list accounts on XRPL ledgers, then join each
 * to its external on-ledger address(es).
 *
 * @param client - The authenticated Custody client.
 * @param domainId - The Custody domain id to discover.
 * @param signer - The custodian these accounts back-reference (TDD §4 —
 * `Account.signer`). Callers pass the `Custodian` instance being constructed
 * (e.g. `this` from a future `RippleCustody.listAccounts()`).
 * @returns One {@link Account} per discovered external XRPL r-address.
 */
export async function discoverXrplAccounts(
  client: CustodyHttpClient,
  domainId: string,
  signer: Custodian,
): Promise<Account[]> {
  const xrplLedgerIds = await resolveXrplLedgerIds(client)

  const apiAccounts = await collectPages(async (startingAfter) =>
    client.get<AccountsResponse>(`/v1/domains/${domainId}/accounts`, {
      limit: PAGE_LIMIT,
      startingAfter,
    }),
  )

  const xrplAccounts = apiAccounts
    .map((apiAccount) => apiAccount.data)
    .filter(
      (account) =>
        account.ledgerId !== undefined && xrplLedgerIds.has(account.ledgerId),
    )

  const accounts: Account[] = []
  for (const account of xrplAccounts) {
    // eslint-disable-next-line no-await-in-loop -- Per-account address join; small N, kept simple.
    const addresses = await listExternalAddresses({
      client,
      domainId,
      accountId: account.id,
      xrplLedgerIds,
    })
    for (const address of addresses) {
      accounts.push({
        address,
        alias: account.alias,
        custodianRef: account.id,
        signer,
      })
    }
  }
  return accounts
}
