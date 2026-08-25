import type { IssuedCurrencyAmount, MPTAmount } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'

import { toCustodyIouAmount } from './iou-amount.js'

type IouCurrency = components['schemas']['Core_XrplIouCurrency']
type ClawbackCurrency = components['schemas']['Core_XrplClawbackCurrency']
type PaymentCurrency = components['schemas']['Core_XrplPaymentCurrency']
type AssetQuantity = components['schemas']['Core_Xrpl_AssetQuantity']

/**
 * Map an xrpl issued-currency amount to Custody's `IouCurrency` union
 * (`TrustSet.limitAmount`, `OfferCreate`'s asset legs). No MPT variant exists
 * here — matches XRPL: trust lines and DEX offers are IOU-only in this union.
 *
 * @param amount - The issued-currency amount to convert.
 * @returns The Custody currency reference.
 */
export function toIouCurrency(amount: IssuedCurrencyAmount): IouCurrency {
  return { code: amount.currency, issuer: amount.issuer, type: 'Currency' }
}

/**
 * Map an xrpl clawback amount (IOU or MPT) to Custody's `ClawbackCurrency`
 * union.
 *
 * @param amount - The IOU or MPT amount to claw back.
 * @returns The Custody currency reference.
 */
export function toClawbackCurrency(
  amount: IssuedCurrencyAmount | MPTAmount,
): ClawbackCurrency {
  if ('mpt_issuance_id' in amount) {
    return { issuanceId: amount.mpt_issuance_id, type: 'MultiPurposeToken' }
  }
  return { code: amount.currency, issuer: amount.issuer, type: 'Currency' }
}

/**
 * Map an xrpl payment amount (IOU or MPT) to Custody's `PaymentCurrency`
 * union. Native XRP (a plain drops string) has no `currency` — callers map
 * that case separately.
 *
 * @param amount - The IOU or MPT amount being sent.
 * @returns The Custody currency reference.
 */
export function toPaymentCurrency(
  amount: IssuedCurrencyAmount | MPTAmount,
): PaymentCurrency {
  if ('mpt_issuance_id' in amount) {
    return { issuanceId: amount.mpt_issuance_id, type: 'MultiPurposeToken' }
  }
  return { code: amount.currency, issuer: amount.issuer, type: 'Currency' }
}

/**
 * Map an xrpl `Amount` (drops string or issued-currency object) to
 * Custody's `AssetQuantity` (`OfferCreate.takerGets`/`takerPays`) — an omitted
 * `currency` means native XRP. An issued-currency value is scaled to Custody's
 * integer minimum unit (see {@link toCustodyIouAmount}); an XRP drops string is
 * already an integer and passes through unchanged.
 *
 * @param amount - The drops string or issued-currency amount.
 * @returns The Custody asset quantity.
 */
export function toAssetQuantity(
  amount: string | IssuedCurrencyAmount,
): AssetQuantity {
  if (typeof amount === 'string') {
    return { amount }
  }
  return {
    amount: toCustodyIouAmount(amount.value),
    currency: toIouCurrency(amount),
  }
}

/**
 * Reject an MPT amount where Custody's operation shape has no MPT support
 * (`OfferCreate`'s legs), and return the drops-or-IOU amount unchanged
 * otherwise.
 *
 * @param transactor - The XRPL transactor name, for the error message.
 * @param field - The field name, for the error message.
 * @param amount - The amount to check.
 * @returns `amount`, narrowed to drops-or-IOU.
 * @throws {@link SignerCapabilityError} if `amount` is an MPT amount.
 */
export function rejectMpt(
  transactor: string,
  field: string,
  amount: string | IssuedCurrencyAmount | MPTAmount,
): string | IssuedCurrencyAmount {
  if (typeof amount !== 'string' && 'mpt_issuance_id' in amount) {
    throw new SignerCapabilityError(
      `RippleCustody cannot natively represent an MPT amount in ${transactor}.${field}. Enable raw signing for this account, or use a different signer.`,
    )
  }
  return amount
}
