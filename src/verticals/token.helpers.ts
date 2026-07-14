import {
  encodeMPTokenMetadata,
  MPTokenIssuanceCreateFlags,
  OfferCreateFlags,
} from 'xrpl'
import type { IssuedCurrencyAmount, MPTokenMetadata } from 'xrpl'

import type { Amount } from '../amount/index.js'
import { toLedgerAmount } from '../amount/index.js'
import type { SubmissionResult } from '../domain/index.js'
import { IntentValidationError } from '../errors.js'

import type { MptIssueFlags, OfferFlags } from './token.types.js'

/**
 * Combine enabled flag bits into a single value.
 *
 * @param entries - `[enabled, bit]` pairs; a bit is set when `enabled` is true.
 * @returns The combined flag number, or `undefined` when none are set.
 */
/* eslint-disable no-bitwise -- XRPL transaction flags are combined as a bitmask */
function combineFlags(
  entries: ReadonlyArray<readonly [boolean | undefined, number]>,
): number | undefined {
  let value = 0
  for (const [enabled, bit] of entries) {
    if (enabled ?? false) {
      value |= bit
    }
  }
  return value === 0 ? undefined : value
}
/* eslint-enable no-bitwise */

/**
 * The SDK's default issuance capabilities: a fully capable, transferable token
 * out of the box. Each is overridable by passing the flag explicitly (e.g.
 * `{ canClawback: false }`). Note MPT capability flags are permanent once the
 * issuance is created.
 */
export const DEFAULT_ISSUE_FLAGS: Required<MptIssueFlags> = {
  canLock: true,
  requireAuth: false,
  canEscrow: true,
  canTrade: true,
  canTransfer: true,
  canClawback: true,
}

/**
 * Map issuance capability booleans to the combined flag value, applying the
 * SDK defaults for any flag the caller did not specify.
 *
 * @param flags - The caller's capability-flag overrides, if any.
 * @returns The combined flag number, or `undefined` when none are enabled.
 */
export function issueFlags(flags?: MptIssueFlags): number | undefined {
  const merged = { ...DEFAULT_ISSUE_FLAGS, ...flags }
  return combineFlags([
    [merged.canLock, MPTokenIssuanceCreateFlags.tfMPTCanLock],
    [merged.requireAuth, MPTokenIssuanceCreateFlags.tfMPTRequireAuth],
    [merged.canEscrow, MPTokenIssuanceCreateFlags.tfMPTCanEscrow],
    [merged.canTrade, MPTokenIssuanceCreateFlags.tfMPTCanTrade],
    [merged.canTransfer, MPTokenIssuanceCreateFlags.tfMPTCanTransfer],
    [merged.canClawback, MPTokenIssuanceCreateFlags.tfMPTCanClawback],
  ])
}

/**
 * Map offer flag booleans to the combined flag value.
 *
 * @param flags - The offer flags, if any.
 * @returns The combined flag number, or `undefined` when none are set.
 */
export function offerFlags(flags?: OfferFlags): number | undefined {
  if (flags === undefined) {
    return undefined
  }
  return combineFlags([
    [flags.passive, OfferCreateFlags.tfPassive],
    [flags.immediateOrCancel, OfferCreateFlags.tfImmediateOrCancel],
    [flags.fillOrKill, OfferCreateFlags.tfFillOrKill],
    [flags.sell, OfferCreateFlags.tfSell],
  ])
}

/**
 * Convert an amount for a DEX offer, rejecting MPT (not DEX-tradeable).
 *
 * @param amount - The offer amount.
 * @returns The ledger amount (XRP drops string or issued-currency amount).
 * @throws {@link IntentValidationError} if the amount's asset is an MPT.
 */
export function toDexAmount(amount: Amount): IssuedCurrencyAmount | string {
  if (amount.asset.kind === 'mpt') {
    throw new IntentValidationError('Offers do not support MPT amounts')
  }
  const ledger = toLedgerAmount(amount)
  if (typeof ledger !== 'string' && 'mpt_issuance_id' in ledger) {
    throw new IntentValidationError('Offers do not support MPT amounts')
  }
  return ledger
}

/**
 * Encode MPT metadata to the on-ledger hex string. A structured object follows
 * the ecosystem metadata standard; a raw string is UTF-8 hex-encoded as-is.
 *
 * @param metadata - Structured metadata or a raw string.
 * @returns The uppercase hex encoding.
 * @throws {@link IntentValidationError} if structured metadata is invalid.
 */
export function encodeMetadata(metadata: MPTokenMetadata | string): string {
  if (typeof metadata === 'string') {
    return Buffer.from(metadata, 'utf8').toString('hex').toUpperCase()
  }
  try {
    return encodeMPTokenMetadata(metadata)
  } catch (error) {
    throw new IntentValidationError('Invalid MPT metadata', { cause: error })
  }
}

/**
 * Read the new MPT issuance id from a rippled submission result's metadata.
 *
 * @param result - The submission result.
 * @returns The issuance id, or an empty string when unavailable.
 */
export function extractMptIssuanceId(result: SubmissionResult): string {
  if (result.source !== 'rippled') {
    return ''
  }
  const { meta } = result.response.result
  if (
    meta !== undefined &&
    typeof meta !== 'string' &&
    'mpt_issuance_id' in meta &&
    typeof meta.mpt_issuance_id === 'string'
  ) {
    return meta.mpt_issuance_id
  }
  return ''
}
