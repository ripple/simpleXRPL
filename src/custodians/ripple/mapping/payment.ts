import type { Payment } from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { toPaymentCurrency } from './currency.js'
import { toDestination } from './destination.js'
import { toCustodyIouAmount } from './iou-amount.js'
import { unsupported } from './unsupported.js'

/**
 * Map an xrpl.js `Payment` to Custody's native operation. Custody has no
 * slot for cross-currency paths (`SendMax`, `Paths`, `DeliverMin`,
 * `DeliverMax`), `InvoiceID`, `CredentialIDs`, `DomainID`, or any `tf*` flag.
 *
 * @param tx - The `Payment` transaction.
 * @returns The Custody `Payment` operation.
 */
export function mapPayment(
  tx: Payment,
): components['schemas']['Core_XrplOperation_Payment'] {
  for (const field of [
    'SendMax',
    'Paths',
    'DeliverMin',
    'DeliverMax',
    'InvoiceID',
    'CredentialIDs',
    'DomainID',
  ] as const) {
    if (tx[field] !== undefined) {
      unsupported('Payment', field)
    }
  }
  if (tx.Flags !== undefined && tx.Flags !== 0) {
    unsupported('Payment', 'Flags')
  }

  const amount = tx.Amount
  if (typeof amount === 'string') {
    return {
      type: 'Payment',
      destination: toDestination(tx.Destination),
      amount,
      destinationTag: tx.DestinationTag,
    }
  }
  // An MPT `value` is already an integer count of base units; only an
  // issued-currency decimal needs scaling into Custody's minimum unit.
  return {
    type: 'Payment',
    destination: toDestination(tx.Destination),
    amount:
      'mpt_issuance_id' in amount
        ? amount.value
        : toCustodyIouAmount(amount.value),
    currency: toPaymentCurrency(amount),
    destinationTag: tx.DestinationTag,
  }
}
