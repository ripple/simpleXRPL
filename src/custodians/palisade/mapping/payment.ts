import { dropsToXrp } from 'xrpl'
import type { Payment } from 'xrpl'

import type { operations } from '../../../generated/palisade.js'

import { palisadeUnsupported } from './unsupported.js'

type TransferBody =
  operations['TransactionsService_TransferTransaction']['requestBody']['content']['application/json']

/** Payment fields with no native Palisade transfer slot. */
const UNSUPPORTED_FIELDS = [
  'SendMax',
  'DeliverMin',
  'Paths',
  'InvoiceID',
] as const

/**
 * Map a `Payment` to Palisade's native `TransferTransaction` body. XRP and IOU
 * are native; MPT amounts, cross-currency fields, and flags have no native slot.
 *
 * @param tx - The Payment transaction.
 * @returns The Palisade transfer body.
 * @throws {@link SignerCapabilityError} for MPT/cross-currency/flag fields.
 */
export function mapPaymentToTransfer(tx: Payment): TransferBody {
  for (const field of UNSUPPORTED_FIELDS) {
    if (tx[field] !== undefined) {
      palisadeUnsupported('Payment', field)
    }
  }
  if (tx.Flags !== undefined) {
    palisadeUnsupported('Payment', 'Flags')
  }

  const body: TransferBody = {
    destinationAddress: tx.Destination,
    ...amountFields(tx.Amount),
  }
  const config = paymentConfig(tx)
  if (config !== undefined) {
    body.config = config
  }
  return body
}

/**
 * The symbol/qty/contract triple for an XRP-drops or IOU amount.
 *
 * @param amount - The Payment `Amount` (XRP drops string or issued currency).
 * @returns The `symbol`, decimal `qty`, and (IOU only) issuer `contract`.
 * @throws {@link SignerCapabilityError} if the amount is MPT-denominated.
 */
function amountFields(amount: Payment['Amount']): {
  symbol: string
  qty: string
  contract?: string
} {
  if (typeof amount === 'string') {
    return { symbol: 'XRP', qty: String(dropsToXrp(amount)) }
  }
  if ('mpt_issuance_id' in amount) {
    palisadeUnsupported('Payment', 'Amount(MPT)')
  }
  return { symbol: amount.currency, contract: amount.issuer, qty: amount.value }
}

/**
 * The `config` block carrying source/destination tags, or undefined.
 *
 * @param tx - The Payment transaction.
 * @returns The transfer `config`, or `undefined` when no tags are set.
 */
function paymentConfig(tx: Payment): TransferBody['config'] | undefined {
  const config: NonNullable<TransferBody['config']> = {}
  if (tx.DestinationTag !== undefined) {
    config.destinationTag = String(tx.DestinationTag)
  }
  if (tx.SourceTag !== undefined) {
    config.sourceTag = String(tx.SourceTag)
  }
  return Object.keys(config).length > 0 ? config : undefined
}
