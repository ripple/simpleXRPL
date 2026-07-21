import { TrustSetFlags } from 'xrpl'
import type { TrustSet } from 'xrpl'

import type { components, operations } from '../../../generated/palisade.js'

import { toCurrencyAmount } from './currency.js'
import { collectFlags } from './flags.js'

type TrustSetBody =
  operations['TransactionsService_SubmitTrustSet']['requestBody']['content']['application/json']
type TrustSetFlag = components['schemas']['transactionsv2TrustSetFlag']

const FLAG_TABLE: ReadonlyArray<readonly [number, TrustSetFlag]> = [
  [TrustSetFlags.tfSetfAuth, 'SETF_AUTH'],
  [TrustSetFlags.tfSetNoRipple, 'SET_NORIPPLE'],
  [TrustSetFlags.tfClearNoRipple, 'UNSET_NORIPPLE'],
  [TrustSetFlags.tfSetFreeze, 'SET_FREEZE'],
  [TrustSetFlags.tfClearFreeze, 'UNSET_FREEZE'],
  [TrustSetFlags.tfSetDeepFreeze, 'SET_DEEP_FREEZE'],
  [TrustSetFlags.tfClearDeepFreeze, 'UNSET_DEEP_FREEZE'],
]

/**
 * Map a `TrustSet` to Palisade's `SubmitTrustSet` body.
 *
 * @param tx - The TrustSet transaction.
 * @returns The Palisade submit body.
 */
export function mapTrustSet(tx: TrustSet): TrustSetBody {
  const flags = collectFlags(tx.Flags, FLAG_TABLE)
  const body: TrustSetBody = {
    limitAmount: toCurrencyAmount(tx.LimitAmount, 'LimitAmount'),
  }
  if (flags.length > 0) {
    body.flags = flags
  }
  if (tx.QualityIn !== undefined) {
    body.qualityIn = tx.QualityIn
  }
  if (tx.QualityOut !== undefined) {
    body.qualityOut = tx.QualityOut
  }
  return body
}
