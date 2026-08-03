import type { Account, Custodian, CustodianRef } from '../../../domain/index.js'
import { PalisadeApiError, SimpleXRPLError } from '../../../errors.js'
import type { operations } from '../../../generated/palisade.js'
import type { PalisadeHttpClient } from '../transport/palisade-http-client.js'

/** Palisade's max page size for collection endpoints. */
const PAGE_SIZE = 100
/** The status a wallet must reach before it has a usable on-ledger address. */
const PROVISIONED_STATUS = 'PROVISIONED'
/** HTTP 403: the credential is authenticated but lacks the required scope. */
const HTTP_FORBIDDEN = 403

/* eslint-disable @typescript-eslint/no-magic-numbers -- 200 indexes the OpenAPI success-response type. */
type SuccessJson<
  Op extends {
    responses: { 200: { content: { 'application/json': unknown } } }
  },
> = Op['responses'][200]['content']['application/json']
/* eslint-enable @typescript-eslint/no-magic-numbers */

type ListGlobalWalletsResponse = SuccessJson<
  operations['VaultService_ListGlobalWallets']
>
type PalisadeWallet = NonNullable<ListGlobalWalletsResponse['wallets']>[number]
/** A Palisade wallet known to have a resolved on-ledger address. */
type AddressedWallet = PalisadeWallet & { address: string }

/**
 * Type guard: is this wallet fully provisioned with a resolved address?
 *
 * @param wallet - The candidate wallet.
 * @returns `true` if the wallet is provisioned and has an address.
 */
function isAddressedXrplWallet(
  wallet: PalisadeWallet,
): wallet is AddressedWallet {
  return wallet.status === PROVISIONED_STATUS && wallet.address !== undefined
}

/**
 * List every XRPL wallet in the organization, walking Palisade's
 * `pageToken` cursor until exhausted (TDD §9.2). Filters server-side via
 * `blockchain: 'XRP_LEDGER'` — Palisade's wallet listing carries the address
 * directly, so no separate address-join is needed (unlike Custody, §9.2).
 *
 * @param client - The authenticated Palisade client.
 * @returns The raw XRPL wallets across all pages.
 */
async function listXrplWallets(
  client: PalisadeHttpClient,
): Promise<PalisadeWallet[]> {
  const wallets: PalisadeWallet[] = []
  let pageToken: string | undefined
  do {
    // Sequential by design: each page's cursor depends on the previous response.
    // eslint-disable-next-line no-await-in-loop -- Cursor pagination is inherently sequential.
    const response = await client.get<ListGlobalWalletsResponse>(
      '/v2/wallets',
      { blockchain: 'XRP_LEDGER', pageSize: PAGE_SIZE, pageToken },
    )
    wallets.push(...(response.wallets ?? []))
    pageToken = response.filter?.nextPageToken
  } while (pageToken !== undefined && pageToken !== '')
  return wallets
}

/**
 * Discover the organization's XRPL wallets as SDK {@link Account}s, keyed by
 * r-address. Only fully provisioned wallets with an address are included.
 *
 * @param client - The authenticated Palisade client.
 * @param signer - The custodian these accounts back-reference (TDD §4 —
 * `Account.signer`). Callers pass the `Custodian` instance being constructed
 * (e.g. `this` from a future `PalisadeCustody.listAccounts()`).
 * @returns One {@link Account} per discovered XRPL wallet address.
 */
export async function discoverXrplWallets(
  client: PalisadeHttpClient,
  signer: Custodian,
): Promise<Account[]> {
  let wallets: PalisadeWallet[]
  try {
    wallets = await listXrplWallets(client)
  } catch (error) {
    if (error instanceof PalisadeApiError && error.status === HTTP_FORBIDDEN) {
      throw new SimpleXRPLError(
        'Palisade wallet discovery (GET /v2/wallets) was forbidden (403): the ' +
          'configured `credentials.wallets` credential lacks the wallet-read ' +
          'permission. Grant it a wallet-read permission set in Palisade.',
        { cause: error },
      )
    }
    throw error
  }

  return wallets.filter(isAddressedXrplWallet).map((wallet): Account => {
    const custodianRef: CustodianRef = {
      vaultId: wallet.vaultId,
      walletId: wallet.id,
    }
    return {
      address: wallet.address,
      alias: wallet.name,
      publicKey: wallet.publicKey,
      custodianRef,
      signer,
    }
  })
}
