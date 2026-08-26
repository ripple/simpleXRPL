import type { Clawback } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'

import { toClawbackCurrency } from './currency.js'
import { toDestination } from './destination.js'
import { toCustodyIouAmount } from './iou-amount.js'

/**
 * Map an xrpl `Clawback` to Custody's native `Clawback` operation.
 *
 * The holder — the account being clawed back from — sits in different places
 * depending on the asset. An MPT clawback names it explicitly in the top-level
 * `Holder`; an issued-currency clawback carries it in `Amount.issuer` (a native
 * XRPL quirk: on a `Clawback`, `Amount.issuer` is the *holder*, while the token
 * issuer is the transaction's `Account`) and never sets a top-level `Holder`.
 *
 * @param tx - The `Clawback` transaction.
 * @returns The Custody `Clawback` operation.
 * @throws {@link SignerCapabilityError} if an MPT clawback omits `Holder`.
 */
export function mapClawback(
  tx: Clawback,
): components['schemas']['Core_XrplOperation_Clawback'] {
  if ('mpt_issuance_id' in tx.Amount) {
    if (tx.Holder === undefined) {
      throw new SignerCapabilityError(
        'RippleCustody requires Clawback.Holder to identify the account being clawed back from.',
      )
    }
    // An MPT `value` is already an integer count of base units.
    return {
      type: 'Clawback',
      currency: toClawbackCurrency(tx.Amount, tx.Account),
      holder: toDestination(tx.Holder),
      value: tx.Amount.value,
    }
  }
  // Issued currency: the holder is Amount.issuer and the token issuer is the
  // transaction's Account. The decimal value scales into Custody's minimum unit.
  return {
    type: 'Clawback',
    currency: toClawbackCurrency(tx.Amount, tx.Account),
    holder: toDestination(tx.Amount.issuer),
    value: toCustodyIouAmount(tx.Amount.value),
  }
}
