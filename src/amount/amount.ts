import BigNumber from 'bignumber.js'
import { xrpToDrops } from 'xrpl'
import type { IssuedCurrencyAmount, MPTAmount } from 'xrpl'

import { IntentValidationError } from '../errors.js'

import type { Asset } from './asset.js'

/**
 * A ledger amount in the shape xrpl.js transactions consume: XRP drops (string),
 * an issued-currency amount, or an MPT amount.
 */
export type LedgerAmount = string | IssuedCurrencyAmount | MPTAmount

/** An amount of an {@link Asset}, expressed as a human-readable decimal string. */
export interface Amount {
  /** What is being moved. */
  readonly asset: Asset

  /** The quantity, as a decimal string in display units (e.g. `'10.5'`). */
  readonly value: string
}

/** XRPL issued-currency values carry at most 15 significant digits. */
const MAX_IOU_SIGNIFICANT_DIGITS = 15

/** Decimal places XRP is divisible to (1 XRP = 1,000,000 drops). */
const XRP_SCALE = 6

/**
 * Convert a display amount to the on-ledger representation, applying decimal and
 * scale conversion and validating precision.
 *
 * @param amount - The display amount.
 * @returns The ledger amount (drops string, IOU amount, or MPT amount).
 * @throws {@link IntentValidationError} if the value is invalid for the asset.
 */
export function toLedgerAmount(amount: Amount): LedgerAmount {
  const { asset, value } = amount
  switch (asset.kind) {
    case 'xrp':
      return toDrops(value)
    case 'iou':
      return {
        currency: asset.currency,
        issuer: asset.issuer,
        value: normalizeIouValue(value),
      }
    case 'mpt':
      return {
        mpt_issuance_id: asset.mptIssuanceId,
        value: toBaseUnits(value, asset.scale),
      }
    default:
      throw new IntentValidationError('Unsupported asset kind')
  }
}

/**
 * Convert an on-ledger amount back to a display amount for the given asset.
 *
 * @param ledger - The ledger amount.
 * @param asset - The asset the ledger amount belongs to (supplies MPT scale).
 * @returns The display amount.
 * @throws {@link IntentValidationError} if `ledger` does not match the asset shape.
 */
export function fromLedgerAmount(ledger: LedgerAmount, asset: Asset): Amount {
  switch (asset.kind) {
    case 'xrp':
      if (typeof ledger !== 'string') {
        throw new IntentValidationError('Expected XRP drops as a string')
      }
      return {
        asset,
        value: new BigNumber(ledger).shiftedBy(-XRP_SCALE).toString(),
      }
    case 'iou':
      if (typeof ledger === 'string' || !('currency' in ledger)) {
        throw new IntentValidationError('Expected an issued-currency amount')
      }
      return { asset, value: ledger.value }
    case 'mpt':
      if (typeof ledger === 'string' || !('mpt_issuance_id' in ledger)) {
        throw new IntentValidationError('Expected an MPT amount')
      }
      return {
        asset,
        value: new BigNumber(ledger.value).shiftedBy(-asset.scale).toString(),
      }
    default:
      throw new IntentValidationError('Unsupported asset kind')
  }
}

/**
 * Parse and validate a decimal value string as a non-negative finite number.
 *
 * @param value - The decimal string.
 * @returns The parsed value.
 * @throws {@link IntentValidationError} if not a non-negative finite decimal.
 */
function parseDecimal(value: string): BigNumber {
  const parsed = new BigNumber(value)
  if (!parsed.isFinite()) {
    throw new IntentValidationError(`Invalid amount value: '${value}'`)
  }
  if (parsed.isNegative()) {
    throw new IntentValidationError(
      `Amount value must not be negative: '${value}'`,
    )
  }
  return parsed
}

function toDrops(value: string): string {
  parseDecimal(value)
  try {
    return xrpToDrops(value)
  } catch (error) {
    throw new IntentValidationError(`Invalid XRP amount: '${value}'`, {
      cause: error,
    })
  }
}

function normalizeIouValue(value: string): string {
  const parsed = parseDecimal(value)
  if (parsed.sd() > MAX_IOU_SIGNIFICANT_DIGITS) {
    throw new IntentValidationError(
      `IOU value exceeds ${MAX_IOU_SIGNIFICANT_DIGITS} significant digits: '${value}'`,
    )
  }
  return parsed.toString()
}

function toBaseUnits(value: string, scale: number): string {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new IntentValidationError(
      `MPT scale must be a non-negative integer: ${scale}`,
    )
  }
  const scaled = parseDecimal(value).shiftedBy(scale)
  if (!scaled.isInteger()) {
    throw new IntentValidationError(
      `MPT value '${value}' has more precision than scale ${scale} allows`,
    )
  }
  return scaled.toFixed(0)
}
