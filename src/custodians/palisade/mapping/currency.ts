import { dropsToXrp } from 'xrpl'
import type { IssuedCurrencyAmount, MPTAmount } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/palisade.js'

type CurrencyAmount = components['schemas']['transactionsv2CurrencyAmount']

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
    return { asset: 'XRP', value: String(dropsToXrp(amount)) }
  }
  if ('mpt_issuance_id' in amount) {
    throw new SignerCapabilityError(
      `Palisade has no native MPT support for ${field}; enable allowRawSigning ` +
        'or use a Local account.',
    )
  }
  return { asset: amount.currency, issuer: amount.issuer, value: amount.value }
}
