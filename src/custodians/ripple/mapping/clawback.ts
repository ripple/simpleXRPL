import type { Clawback } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'

import { toClawbackCurrency } from './currency.js'
import { toDestination } from './destination.js'

/**
 * Map an xrpl.js `Clawback` to Custody's native `Clawback` operation.
 *
 * @param tx - The `Clawback` transaction.
 * @returns The Custody `Clawback` operation.
 * @throws {@link SignerCapabilityError} if `Holder` is absent — Custody
 * requires it, unlike xrpl.js.
 */
export function mapClawback(
  tx: Clawback,
): components['schemas']['Core_XrplOperation_Clawback'] {
  if (tx.Holder === undefined) {
    throw new SignerCapabilityError(
      'RippleCustody requires Clawback.Holder to identify the account being clawed back from.',
    )
  }
  return {
    type: 'Clawback',
    currency: toClawbackCurrency(tx.Amount),
    holder: toDestination(tx.Holder),
    value: 'value' in tx.Amount ? tx.Amount.value : tx.Amount,
  }
}
