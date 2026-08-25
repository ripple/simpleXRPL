import type { Clawback } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'

import { toClawbackCurrency } from './currency.js'
import { toDestination } from './destination.js'
import { toCustodyIouAmount } from './iou-amount.js'

/**
 * Map an xrpl `Clawback` to Custody's native `Clawback` operation.
 *
 * @param tx - The `Clawback` transaction.
 * @returns The Custody `Clawback` operation.
 * @throws {@link SignerCapabilityError} if `Holder` is absent — Custody
 * requires it, unlike xrpl.
 */
export function mapClawback(
  tx: Clawback,
): components['schemas']['Core_XrplOperation_Clawback'] {
  if (tx.Holder === undefined) {
    throw new SignerCapabilityError(
      'RippleCustody requires Clawback.Holder to identify the account being clawed back from.',
    )
  }
  // An MPT `value` is already an integer count of base units; only an
  // issued-currency decimal needs scaling into Custody's minimum unit.
  return {
    type: 'Clawback',
    currency: toClawbackCurrency(tx.Amount),
    holder: toDestination(tx.Holder),
    value:
      'mpt_issuance_id' in tx.Amount
        ? tx.Amount.value
        : toCustodyIouAmount(tx.Amount.value),
  }
}
