import BigNumber from 'bignumber.js'
import type { IssuedCurrencyAmount, MPTAmount } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/palisade.js'

type CurrencyAmount = components['schemas']['transactionsv2CurrencyAmount']

/** 1 XRP = 10^6 drops. */
const XRP_DECIMALS = 6

/**
 * Convert XRPL drops to the decimal XRP string Palisade's wire format expects.
 *
 * Deliberately not `String(dropsToXrp(drops))`: xrpl.js returns a JS `number`,
 * so an amount above 2^53 drops (~9.007e9 XRP) is silently truncated. Unlike the
 * read path, this is a *write* — a truncated quantity here is what the custodian
 * would actually be asked to send.
 *
 * @param drops - The amount in drops (an integer string).
 * @returns The exact amount in XRP.
 */
export function dropsToDecimalXrp(drops: string): string {
  return new BigNumber(drops).shiftedBy(-XRP_DECIMALS).toString()
}

/**
 * Map an xrpl.js amount to Palisade's `CurrencyAmount` (`{ asset, value,
 * issuer? }`). XRP drops become a decimal `value`; an IOU keeps its currency
 * code as `asset` and issuer as `issuer`.
 *
 * @param amount - An XRP drops string or an issued-currency amount.
 * @param field - The originating field name, for error messages.
 * @returns The Palisade currency amount.
 * @throws {@link SignerCapabilityError} if the amount is MPT-denominated
 *   (Palisade has no native MPT support).
 */
export function toCurrencyAmount(
  amount: IssuedCurrencyAmount | MPTAmount | string,
  field: string,
): CurrencyAmount {
  if (typeof amount === 'string') {
    return { asset: 'XRP', value: dropsToDecimalXrp(amount) }
  }
  if ('mpt_issuance_id' in amount) {
    throw new SignerCapabilityError(
      `Palisade has no native MPT support for ${field}; enable allowRawSigning ` +
        'or use a Local account.',
    )
  }
  return { asset: amount.currency, issuer: amount.issuer, value: amount.value }
}
