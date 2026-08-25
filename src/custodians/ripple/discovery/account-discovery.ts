import type { Account, Custodian } from '../../../domain/index.js'
import type { components, operations } from '../../../generated/custody.js'
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

/**
 * A Custody collection page: a list of items plus an optional next cursor.
 * Custody's API returns a literal `null` for `nextStartingAfter` on the last
 * page (not an omitted field), so the cursor must be treated as absent for
 * both `null` and `undefined`.
 */
interface Page<T> {
  items: T[]
  nextStartingAfter?: string | null
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
    cursor = page.nextStartingAfter ?? undefined
  } while (cursor !== undefined && cursor !== '')
  return all
}

/**
 * Resolve the XRPL ledgers in this Custody environment, mapping each ledger id
 * to the XRPL `network_id` it runs on (Mainnet 0, Testnet 1, Devnet 2). Ledgers
 * are matched by the parameters discriminator (`type === 'XRPL'`), which also
 * narrows `parameters` so `networkId` is readable — avoiding a hardcoded,
 * environment-specific id. The network id lets the client pick the ledger
 * matching the node it is connected to when one address is registered on
 * several ledgers.
 *
 * @param client - The authenticated Custody client.
 * @returns A map from XRPL ledger id to its network id.
 */
async function resolveXrplLedgers(
  client: CustodyHttpClient,
): Promise<Map<string, number>> {
  const ledgers = await collectPages(async (startingAfter) =>
    client.get<LedgersResponse>('/v1/ledgers', {
      limit: PAGE_LIMIT,
      startingAfter,
    }),
  )
  const byId = new Map<string, number>()
  for (const ledger of ledgers) {
    if (ledger.data.parameters.type === 'XRPL') {
      byId.set(ledger.data.id, ledger.data.parameters.networkId)
    }
  }
  return byId
}

/** Inputs for listing one account's external XRPL addresses. */
interface AddressLookup {
  client: CustodyHttpClient
  domainId: string
  accountId: string
  xrplLedgers: Map<string, number>
}

/** One external XRPL address, with the ledger id and network id it's on. */
interface ExternalAddress {
  address: string
  ledgerId: string
  networkId: number
}

/**
 * List the external XRPL addresses of one Custody account.
 *
 * @param lookup - The client, domain, account, and XRPL ledgers.
 * @returns The external r-addresses for the account, each with its ledger id
 *   and network id.
 */
async function listExternalAddresses(
  lookup: AddressLookup,
): Promise<ExternalAddress[]> {
  const { client, domainId, accountId, xrplLedgers } = lookup
  const path = `/v1/domains/${domainId}/accounts/${accountId}/addresses`
  const addresses = await collectPages(async (startingAfter) =>
    client.get<AddressesResponse>(path, { limit: PAGE_LIMIT, startingAfter }),
  )
  return addresses
    .map((entry) => entry.data)
    .flatMap((data) => {
      const networkId = xrplLedgers.get(data.ledgerId)
      if (data.scope !== 'External' || networkId === undefined) {
        return []
      }
      return [{ address: data.address, ledgerId: data.ledgerId, networkId }]
    })
}

/**
 * Whether a Custody account has a usable XRPL ledger — either via the legacy
 * single top-level `ledgerId` field, or (for multi-ledger Vault accounts,
 * which report `ledgerId: null` at the top level) an `Activated` entry in
 * `additionalDetails.ledgers`.
 *
 * @param apiAccount - The raw Custody API account envelope.
 * @param xrplLedgers - The XRPL ledgers in this Custody environment.
 * @returns `true` if this account has an activated XRPL ledger.
 */
function hasActivatedXrplLedger(
  apiAccount: components['schemas']['Core_ApiAccount'],
  xrplLedgers: Map<string, number>,
): boolean {
  const { ledgerId } = apiAccount.data
  if (ledgerId !== undefined && xrplLedgers.has(ledgerId)) {
    return true
  }
  return (apiAccount.additionalDetails?.ledgers ?? []).some(
    (entry) => entry.status === 'Activated' && xrplLedgers.has(entry.ledgerId),
  )
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
  const xrplLedgers = await resolveXrplLedgers(client)

  const apiAccounts = await collectPages(async (startingAfter) =>
    client.get<AccountsResponse>(`/v1/domains/${domainId}/accounts`, {
      limit: PAGE_LIMIT,
      startingAfter,
    }),
  )

  const xrplAccounts = apiAccounts
    .filter((apiAccount) => hasActivatedXrplLedger(apiAccount, xrplLedgers))
    .map((apiAccount) => apiAccount.data)

  const accounts: Account[] = []
  for (const account of xrplAccounts) {
    // eslint-disable-next-line no-await-in-loop -- Per-account address join; small N, kept simple.
    const addresses = await listExternalAddresses({
      client,
      domainId,
      accountId: account.id,
      xrplLedgers,
    })
    for (const { address, ledgerId, networkId } of addresses) {
      accounts.push({
        address,
        alias: account.alias,
        custodianRef: account.id,
        ledgerId,
        networkId,
        signer,
      })
    }
  }
  return accounts
}
