import { OfferCreateFlags } from 'xrpl'
import type { OfferCreate } from 'xrpl'

import type { components, operations } from '../../../generated/palisade.js'

import { toCurrencyAmount } from './currency.js'
import { collectFlags } from './flags.js'

type OfferCreateBody =
  operations['TransactionsService_SubmitOfferCreate']['requestBody']['content']['application/json']
type OfferFlag = components['schemas']['transactionsv2OfferCreateFlags']

const FLAG_TABLE: ReadonlyArray<readonly [number, OfferFlag]> = [
  [OfferCreateFlags.tfPassive, 'PASSIVE'],
  [OfferCreateFlags.tfImmediateOrCancel, 'IMMEDIATE_OR_CANCEL'],
  [OfferCreateFlags.tfFillOrKill, 'FILL_OR_KILL'],
  [OfferCreateFlags.tfSell, 'SELL'],
]

/**
 * Map an `OfferCreate` to Palisade's `SubmitOfferCreate` body.
 *
 * @param tx - The OfferCreate transaction.
 * @returns The Palisade submit body.
 */
export function mapOfferCreate(tx: OfferCreate): OfferCreateBody {
  const flags = collectFlags(tx.Flags, FLAG_TABLE)
  const body: OfferCreateBody = {
    takerGets: toCurrencyAmount(tx.TakerGets, 'TakerGets'),
    takerPays: toCurrencyAmount(tx.TakerPays, 'TakerPays'),
  }
  if (flags.length > 0) {
    body.flags = flags
  }
  if (tx.Expiration !== undefined) {
    body.expiration = String(tx.Expiration)
  }
  if (tx.OfferSequence !== undefined) {
    body.offerSequence = String(tx.OfferSequence)
  }
  return body
}
