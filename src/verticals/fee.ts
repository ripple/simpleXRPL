import { SimpleXRPLError } from '../errors.js'

/** Divisor turning a percentage into a fraction. */
const PERCENT = 100
/** An `AccountSet` `TransferRate` of `0` means "no fee". */
const NO_TRANSFER_RATE = 0
/** `TransferRate` is scaled so that 1e9 represents a 0% fee (a 1.0 multiplier). */
const TRANSFER_RATE_ONE = 1_000_000_000
/** The maximum `AccountSet` transfer fee, as a percentage (200% multiplier). */
const MAX_TRANSFER_RATE_PERCENT = 100

/** MPT `TransferFee` is expressed in increments of 0.001% (1000 units = 1%). */
const MPT_FEE_UNITS_PER_PERCENT = 1000
/** The maximum MPT `TransferFee`, as a percentage (50000 units). */
const MAX_MPT_FEE_PERCENT = 50

/**
 * Convert a transfer-fee percentage (e.g. `0.5` for 0.5%) into the integer
 * `AccountSet` `TransferRate` the ledger expects. `0` maps to the "no fee"
 * sentinel.
 *
 * @param percent - The fee as a percentage, from 0 to 100.
 * @returns The on-ledger `TransferRate`.
 * @throws {@link SimpleXRPLError} if the percentage is outside 0–100.
 */
export function percentToTransferRate(percent: number): number {
  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > MAX_TRANSFER_RATE_PERCENT
  ) {
    throw new SimpleXRPLError(
      'transferRate must be a percentage between 0 and 100',
    )
  }
  if (percent === 0) {
    return NO_TRANSFER_RATE
  }
  return Math.round(TRANSFER_RATE_ONE * (1 + percent / PERCENT))
}

/**
 * Convert a transfer-fee percentage (e.g. `0.5` for 0.5%) into the integer MPT
 * `TransferFee` the ledger expects (increments of 0.001%).
 *
 * @param percent - The fee as a percentage, from 0 to 50.
 * @returns The on-ledger `TransferFee`.
 * @throws {@link SimpleXRPLError} if the percentage is outside 0–50.
 */
export function percentToTransferFee(percent: number): number {
  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > MAX_MPT_FEE_PERCENT
  ) {
    throw new SimpleXRPLError(
      'transferFee must be a percentage between 0 and 50',
    )
  }
  return Math.round(percent * MPT_FEE_UNITS_PER_PERCENT)
}
