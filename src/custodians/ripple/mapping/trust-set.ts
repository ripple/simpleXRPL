import { TrustSetFlags } from 'xrpl'
import type { TrustSet } from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { toIouCurrency } from './currency.js'
import { collectFlags, hasFlag } from './flags.js'
import { unsupported } from './unsupported.js'

type TrustSetFlag = components['schemas']['Core_Xrpl_TrustSetFlag']

/** `TrustSetFlags` bit values Custody's native operation carries in its `flags` list. */
const TRUST_SET_FLAGS: ReadonlyArray<readonly [number, TrustSetFlag]> = [
  [TrustSetFlags.tfSetFreeze, 'tfSetFreeze'],
  [TrustSetFlags.tfClearFreeze, 'tfClearFreeze'],
  [TrustSetFlags.tfSetfAuth, 'tfSetfAuth'],
]

/**
 * Resolve `TrustSet`'s combined `enableRippling` tri-state from its two
 * mutually exclusive ripple flags.
 *
 * @param setNoRipple - Whether `tfSetNoRipple` is set.
 * @param clearNoRipple - Whether `tfClearNoRipple` is set.
 * @returns `false` for set, `true` for clear, `undefined` if neither is set.
 */
function resolveEnableRippling(
  setNoRipple: boolean,
  clearNoRipple: boolean,
): boolean | undefined {
  if (clearNoRipple) {
    return true
  }
  if (setNoRipple) {
    return false
  }
  return undefined
}

/**
 * Map an xrpl.js `TrustSet` to Custody's native operation. `tfSetNoRipple` /
 * `tfClearNoRipple` map to the dedicated `enableRippling` boolean; deep-freeze
 * flags and `QualityIn`/`QualityOut` have no Custody slot.
 *
 * @param tx - The `TrustSet` transaction.
 * @returns The Custody `TrustSet` operation.
 */
export function mapTrustSet(
  tx: TrustSet,
): components['schemas']['Core_XrplOperation_TrustSet'] {
  if (tx.QualityIn !== undefined) {
    unsupported('TrustSet', 'QualityIn')
  }
  if (tx.QualityOut !== undefined) {
    unsupported('TrustSet', 'QualityOut')
  }
  if (hasFlag(tx.Flags, TrustSetFlags.tfSetDeepFreeze, 'tfSetDeepFreeze')) {
    unsupported('TrustSet', 'Flags(tfSetDeepFreeze)')
  }
  if (hasFlag(tx.Flags, TrustSetFlags.tfClearDeepFreeze, 'tfClearDeepFreeze')) {
    unsupported('TrustSet', 'Flags(tfClearDeepFreeze)')
  }

  const enableRippling = resolveEnableRippling(
    hasFlag(tx.Flags, TrustSetFlags.tfSetNoRipple, 'tfSetNoRipple'),
    hasFlag(tx.Flags, TrustSetFlags.tfClearNoRipple, 'tfClearNoRipple'),
  )

  return {
    type: 'TrustSet',
    flags: collectFlags(tx.Flags, TRUST_SET_FLAGS),
    limitAmount: {
      currency: toIouCurrency(tx.LimitAmount),
      value: tx.LimitAmount.value,
    },
    enableRippling,
  }
}
