import { OfferCreateFlags } from 'xrpl'
import type { OfferCreate } from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { rejectMpt, toAssetQuantity } from './currency.js'
import { collectFlags, hasFlag } from './flags.js'
import { unsupported } from './unsupported.js'

type OfferCreateFlag = components['schemas']['Core_Xrpl_OfferCreateFlag']

/** `OfferCreateFlags` bit values Custody's native operation carries in its `flags` list. */
const OFFER_CREATE_FLAGS: ReadonlyArray<readonly [number, OfferCreateFlag]> = [
  [OfferCreateFlags.tfImmediateOrCancel, 'tfImmediateOrCancel'],
  [OfferCreateFlags.tfFillOrKill, 'tfFillOrKill'],
  [OfferCreateFlags.tfSell, 'tfSell'],
]

/** `OfferCreateFlags` bit values Custody has no native representation for. */
const UNSUPPORTED_OFFER_CREATE_FLAGS: ReadonlyArray<readonly [number, string]> =
  [
    [OfferCreateFlags.tfPassive, 'tfPassive'],
    [OfferCreateFlags.tfHybrid, 'tfHybrid'],
  ]

/**
 * Map an xrpl.js `OfferCreate` to Custody's native operation. Custody has no
 * slot for `Expiration`, `OfferSequence`, `DomainID`, `tfPassive`, `tfHybrid`,
 * or MPT-denominated legs.
 *
 * @param tx - The `OfferCreate` transaction.
 * @returns The Custody `OfferCreate` operation.
 */
export function mapOfferCreate(
  tx: OfferCreate,
): components['schemas']['Core_XrplOperation_OfferCreate'] {
  for (const field of ['Expiration', 'OfferSequence', 'DomainID'] as const) {
    if (tx[field] !== undefined) {
      unsupported('OfferCreate', field)
    }
  }
  for (const [bit, name] of UNSUPPORTED_OFFER_CREATE_FLAGS) {
    if (hasFlag(tx.Flags, bit, name)) {
      unsupported('OfferCreate', `Flags(${name})`)
    }
  }

  return {
    type: 'OfferCreate',
    flags: collectFlags(tx.Flags, OFFER_CREATE_FLAGS),
    takerGets: toAssetQuantity(
      rejectMpt('OfferCreate', 'TakerGets', tx.TakerGets),
    ),
    takerPays: toAssetQuantity(
      rejectMpt('OfferCreate', 'TakerPays', tx.TakerPays),
    ),
  }
}
