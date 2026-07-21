import type { OfferCancel } from 'xrpl'

import type { operations } from '../../../generated/palisade.js'

type OfferCancelBody =
  operations['TransactionsService_SubmitOfferCancel']['requestBody']['content']['application/json']

/**
 * Map an `OfferCancel` to Palisade's `SubmitOfferCancel` body.
 *
 * @param tx - The OfferCancel transaction.
 * @returns The Palisade submit body.
 */
export function mapOfferCancel(tx: OfferCancel): OfferCancelBody {
  return { offerSequence: String(tx.OfferSequence) }
}
