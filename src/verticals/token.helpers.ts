import {
  encodeMPTokenMetadata,
  MPTokenIssuanceCreateFlags,
  OfferCreateFlags,
  validateMPTokenMetadata,
} from 'xrpl'
import type {
  IssuedCurrencyAmount,
  MPTokenIssuanceCreate,
  MPTokenMetadata,
} from 'xrpl'

import type { Amount } from '../amount/index.js'
import { toLedgerAmount } from '../amount/index.js'
import type { SubmissionResult } from '../domain/index.js'
import { IntentValidationError } from '../errors.js'

import { percentToTransferFee } from './fee.js'
import type {
  MptIssueParams,
  MptIssueFlags,
  OfferFlags,
} from './token.types.js'

/** Default decimal places for a new issuance when `assetScale` is omitted. */
const DEFAULT_ASSET_SCALE = 2

/**
 * Build the `MPTokenIssuanceCreate` for {@link Token.issue}: applies the default
 * asset scale, encodes metadata, and sets the optional cap, fee, and flags.
 *
 * @param account - The issuer r-address.
 * @param params - The issuance settings.
 * @returns The built transaction.
 */
export function buildIssuance(
  account: string,
  params: MptIssueParams,
): MPTokenIssuanceCreate {
  const tx: MPTokenIssuanceCreate = {
    TransactionType: 'MPTokenIssuanceCreate',
    Account: account,
    AssetScale: params.assetScale ?? DEFAULT_ASSET_SCALE,
    MPTokenMetadata: encodeMetadata(params.metadata),
  }
  if (params.maximumAmount !== undefined) {
    tx.MaximumAmount = params.maximumAmount
  }
  if (params.transferFee !== undefined) {
    tx.TransferFee = percentToTransferFee(params.transferFee)
  }
  const flags = issueFlags(params.flags)
  if (flags !== undefined) {
    tx.Flags = flags
  }
  return tx
}

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
 * Encode structured or string metadata to the on-ledger hex form. A structured
 * object goes through the xrpl helper; a raw string is UTF-8 hex-encoded as-is.
 *
 * @param metadata - Structured metadata or a raw string.
 * @returns The uppercase hex encoding.
 * @throws Error if a structured object cannot be encoded.
 */
function toMetadataHex(metadata: MPTokenMetadata | string): string {
  if (typeof metadata === 'string') {
    return Buffer.from(metadata, 'utf8').toString('hex').toUpperCase()
  }
  return encodeMPTokenMetadata(metadata)
}

/**
 * Check MPT metadata against the XLS-89 standard without throwing — the
 * pre-flight companion to `Token.issue`. Accepts a structured object or a raw
 * string, so callers can validate before (or independent of) issuing.
 *
 * @param metadata - Structured metadata or a raw string.
 * @returns A list of problems; an empty array means the metadata is valid.
 */
export function validateTokenMetadata(
  metadata: MPTokenMetadata | string,
): string[] {
  let hex: string
  try {
    hex = toMetadataHex(metadata)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return [`metadata could not be encoded: ${reason}`]
  }
  return validateMPTokenMetadata(hex)
}

/**
 * Encode MPT metadata to the on-ledger hex string and enforce the XLS-89
 * standard. A structured object is encoded via the xrpl helper; a raw string is
 * UTF-8 hex-encoded as-is. The result is validated and rejected if it does not
 * adhere to the standard.
 *
 * @param metadata - Structured metadata or a raw string.
 * @returns The uppercase hex encoding.
 * @throws {@link IntentValidationError} if the metadata cannot be encoded or
 *   does not follow the XLS-89 standard.
 */
export function encodeMetadata(metadata: MPTokenMetadata | string): string {
  let hex: string
  try {
    hex = toMetadataHex(metadata)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new IntentValidationError(
      `Token.issue metadata could not be encoded: ${reason}. Pass a ` +
        'structured MPTokenMetadata object or an XLS-89-compliant JSON string.',
      { cause: error },
    )
  }
  const problems = validateMPTokenMetadata(hex)
  if (problems.length > 0) {
    throw new IntentValidationError(
      'Token.issue metadata does not follow the XLS-89 standard. Fix the ' +
        'following before issuing (required fields: ticker, name, icon, ' +
        'asset_class, issuer_name; asset_subclass is required when asset_class ' +
        'is "rwa") — or call validateTokenMetadata(metadata) to check first:' +
        `\n  - ${problems.join('\n  - ')}`,
    )
  }
  return hex
}

/**
 * Read the new MPT issuance id from a xrpld submission result's metadata.
 *
 * @param result - The submission result.
 * @returns The issuance id, or an empty string when unavailable.
 */
export function extractMptIssuanceId(result: SubmissionResult): string {
  if (result.source !== 'xrpld') {
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
