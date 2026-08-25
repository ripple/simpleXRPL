import BigNumber from 'bignumber.js'

import { IntentValidationError } from '../../../errors.js'

/**
 * Exponent between an XRPL issued-currency's human decimal value and Custody's
 * integer wire amount.
 *
 * An XRPL issued-currency amount has a minimum representable magnitude of
 * 10^-81 — the normalized mantissa floor (10^15) at the minimum exponent
 * (10^-96). Ripple Custody's IOU amount fields (`AssetQuantity.amount`,
 * `LimitAmount.value`, and the issued-currency `Payment`/`Clawback` amounts)
 * are *integers* counted in that minimum unit — the issued-currency analogue of
 * XRP drops — not the human decimal `value` xrpl carries. So a token value
 * scales up by 10^81 to reach the integer Custody expects; forwarding the raw
 * decimal makes Custody read it as a vanishingly small fraction of the intended
 * amount.
 */
const IOU_MIN_UNIT_EXPONENT = 81

/**
 * Convert an xrpl issued-currency `value` (a human decimal string) to the
 * integer Ripple Custody expects for an IOU amount, by scaling it into Custody's
 * 10^-81 minimum unit.
 *
 * @param value - The issued-currency decimal value (e.g. `'50'`, `'12.345'`).
 * @returns The value scaled to Custody's minimum-unit integer, as a string.
 * @throws {@link IntentValidationError} if `value` is not a finite decimal, or
 *   carries more precision than the 10^-81 minimum unit can represent.
 */
export function toCustodyIouAmount(value: string): string {
  const scaled = new BigNumber(value).shiftedBy(IOU_MIN_UNIT_EXPONENT)
  if (!scaled.isFinite()) {
    throw new IntentValidationError(`Invalid IOU amount value: '${value}'`)
  }
  if (!scaled.isInteger()) {
    throw new IntentValidationError(
      `IOU value '${value}' has more precision than Ripple Custody's minimum ` +
        `representable unit (10^-${IOU_MIN_UNIT_EXPONENT}) allows.`,
    )
  }
  return scaled.toFixed(0)
}
