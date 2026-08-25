import BigNumber from 'bignumber.js'

import { SimpleXRPLError } from '../errors.js'
import type { SubmissionHost } from '../pipeline/index.js'

const STANDARD_CODE_LEN = 3
const HEX_CODE_LEN = 40
const PRINTABLE_MIN = 0x20
const PRINTABLE_MAX = 0x7e
/** 1 XRP = 10^6 drops. */
const XRP_DECIMALS = 6

/**
 * Resolve the account a read targets. Reads never require a signer: pass an
 * explicit `account`, or fall back to the primary signer's account when one is
 * configured.
 *
 * @param host - The client the read runs against.
 * @param account - An explicit r-address to query, if any.
 * @returns The r-address to query.
 * @throws {@link SimpleXRPLError} if no account is given and there is no primary.
 */
export function readAccountAddress(
  host: SubmissionHost,
  account?: string,
): string {
  if (account !== undefined && account !== '') {
    return account
  }
  const primary = host.primaryAddress()
  if (primary === undefined) {
    throw new SimpleXRPLError(
      'This read needs an account: pass `account`, or configure a primary signer.',
    )
  }
  return primary
}

/**
 * Decode an XRPL currency code to a human ticker: a 3-character ISO code is
 * returned as-is; a 40-character hex code is decoded to ASCII when printable,
 * else returned unchanged.
 *
 * @param code - The currency code from the ledger (ISO or hex).
 * @returns The human-readable ticker.
 */
export function decodeCurrency(code: string): string {
  if (code.length !== HEX_CODE_LEN) {
    return code
  }
  const bytes = Buffer.from(code, 'hex')
  const printable = bytes.every(
    (byte) => byte === 0 || (byte >= PRINTABLE_MIN && byte <= PRINTABLE_MAX),
  )
  if (!printable) {
    return code
  }
  const ascii = bytes.toString('utf8').replace(/\0+$/u, '')
  return ascii.length >= STANDARD_CODE_LEN ? ascii : code
}

/**
 * Convert a drops string to a decimal XRP string, exactly.
 *
 * Deliberately not `String(dropsToXrp(drops))`: xrpl's `dropsToXrp` returns
 * a JS `number`, so balances above 2^53 drops (~9.007e9 XRP) lose precision
 * *silently* — `50000000000000001` drops would read back as `50000000000` XRP,
 * dropping a whole drop with no error. Balances at that scale are real
 * (treasury and escrow accounts), and this feeds the values callers reconcile
 * against, so the shift is done in decimal instead.
 *
 * @param drops - The amount in drops (an integer string).
 * @returns The exact amount in XRP.
 */
export function dropsToXrpString(drops: string): string {
  return new BigNumber(drops).shiftedBy(-XRP_DECIMALS).toString()
}

/** A `ledger_entry` response carrying the requested node when it exists. */
interface LedgerEntryResponse<T> {
  readonly result: { readonly node?: T }
}

/**
 * Look up a single ledger object, returning `undefined` when it does not exist
 * (xrpld answers a missing entry with an error, which we treat as "absent").
 *
 * @param host - The client the read runs against.
 * @param request - The `ledger_entry` parameters (minus `command`/`ledger_index`).
 * @returns The node, or `undefined` if it does not exist.
 */
export async function ledgerEntryNode<T>(
  host: SubmissionHost,
  request: Readonly<Record<string, unknown>>,
): Promise<T | undefined> {
  try {
    const response = await host.ledger.request<LedgerEntryResponse<T>>({
      command: 'ledger_entry',
      ledger_index: 'validated',
      ...request,
    })
    return response.result.node
  } catch {
    return undefined
  }
}
