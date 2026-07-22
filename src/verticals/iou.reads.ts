import type { SubmissionHost } from '../pipeline/index.js'
import { decodeCurrency, readAccountAddress } from '../reads/read-helpers.js'

import { encodeCurrencyCode } from './iou.helpers.js'
import type {
  IOUListParams,
  IOUListResult,
  IOURetrieveParams,
  IOURetrieveResult,
  IOUTrustLine,
} from './iou.types.js'

/** A trust line as returned by `account_lines` (only the fields we shape). */
interface AccountLine {
  readonly account: string
  readonly balance: string
  readonly currency: string
  readonly limit: string
  readonly limit_peer: string
  readonly no_ripple?: boolean
  readonly freeze?: boolean
  readonly authorized?: boolean
}

interface AccountLinesResponse {
  readonly result: { readonly lines: readonly AccountLine[] }
}

/**
 * Shape a raw `account_lines` entry into an {@link IOUTrustLine}.
 *
 * @param line - The raw trust line.
 * @returns The shaped trust line.
 */
function shapeTrustLine(line: AccountLine): IOUTrustLine {
  return {
    currency: decodeCurrency(line.currency),
    peer: line.account,
    balance: line.balance,
    limit: line.limit,
    limitPeer: line.limit_peer,
    noRipple: line.no_ripple ?? false,
    frozen: line.freeze ?? false,
    authorized: line.authorized ?? false,
  }
}

/**
 * Fetch every trust line for an account and shape it.
 *
 * @param host - The client the read runs against.
 * @param account - The account whose lines to fetch.
 * @param peer - Restrict to lines with this counterparty (used by `retrieve`).
 * @returns The raw lines.
 */
async function fetchLines(
  host: SubmissionHost,
  account: string,
  peer?: string,
): Promise<readonly AccountLine[]> {
  const response = await host.ledger.request<AccountLinesResponse>({
    command: 'account_lines',
    account,
    peer,
    ledger_index: 'validated',
  })
  return response.result.lines
}

/**
 * Retrieve a single IOU trust line (point-in-time), by ticker and issuer.
 *
 * @param host - The client the read runs against.
 * @param params - The IOU ticker, issuer, and holder account (default primary).
 * @returns The `iouID` and the shaped line, or `undefined` data if none exists.
 */
export async function retrieveIou(
  host: SubmissionHost,
  params: IOURetrieveParams,
): Promise<IOURetrieveResult> {
  const holder = readAccountAddress(host, params.account)
  const currency = encodeCurrencyCode(params.ticker)
  const lines = await fetchLines(host, holder, params.issuer)
  const match = lines.find((line) => line.currency === currency)
  return {
    iouID: `${decodeCurrency(currency)}.${params.issuer}`,
    data: match === undefined ? undefined : shapeTrustLine(match),
  }
}

/**
 * List every IOU trust line for an account.
 *
 * @param host - The client the read runs against.
 * @param params - The role (unused beyond labeling) and account (default primary).
 * @returns The `iouID`s and shaped lines, index-aligned.
 */
export async function listIous(
  host: SubmissionHost,
  params?: IOUListParams,
): Promise<IOUListResult> {
  const account = readAccountAddress(host, params?.account)
  const lines = await fetchLines(host, account)
  const data = lines.map(shapeTrustLine)
  const ious = data.map((line) => `${line.currency}.${line.peer}`)
  return { ious, data }
}
