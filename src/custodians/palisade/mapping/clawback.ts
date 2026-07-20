import type { Clawback } from 'xrpl'

import type { operations } from '../../../generated/palisade.js'

import { toCurrencyAmount } from './currency.js'

type ClawbackBody =
  operations['TransactionsService_SubmitClawback']['requestBody']['content']['application/json']

/**
 * Map a `Clawback` to Palisade's `SubmitClawback` body. Only issued-currency
 * clawback is native; MPT clawback is rejected by {@link toCurrencyAmount}.
 *
 * @param tx - The Clawback transaction.
 * @returns The Palisade submit body.
 */
export function mapClawback(tx: Clawback): ClawbackBody {
  return {
    amount: toCurrencyAmount(tx.Amount, 'Amount'),
  }
}
