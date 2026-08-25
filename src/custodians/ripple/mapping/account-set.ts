import { AccountSetAsfFlags } from 'xrpl'
import type { AccountSet } from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { unsupported } from './unsupported.js'

type AccountSetFlag = components['schemas']['Core_Xrpl_AccountSetFlag']

/** `AccountSetAsfFlags` numeric values Custody's `setFlag`/`clearFlag` can carry. */
const ACCOUNT_SET_ASF_FLAGS: ReadonlyMap<number, AccountSetFlag> = new Map([
  [AccountSetAsfFlags.asfRequireDest, 'asfRequireDest'],
  [AccountSetAsfFlags.asfRequireAuth, 'asfRequireAuth'],
  [AccountSetAsfFlags.asfAccountTxnID, 'asfAccountTxnID'],
  [AccountSetAsfFlags.asfNoFreeze, 'asfNoFreeze'],
  [AccountSetAsfFlags.asfGlobalFreeze, 'asfGlobalFreeze'],
  [AccountSetAsfFlags.asfDefaultRipple, 'asfDefaultRipple'],
  [AccountSetAsfFlags.asfDepositAuth, 'asfDepositAuth'],
  [AccountSetAsfFlags.asfAllowTrustLineClawback, 'asfAllowTrustLineClawback'],
])

/**
 * Resolve an `AccountSet(Set|Clear)Flag` numeric value to Custody's flag enum.
 *
 * @param field - `'SetFlag'` or `'ClearFlag'`, for the error message.
 * @param flag - The numeric `AccountSetAsfFlags` value.
 * @returns The matching Custody flag name.
 * @throws {@link SignerCapabilityError} if the flag isn't one Custody models.
 */
function toAccountSetFlag(field: string, flag: number): AccountSetFlag {
  const mapped = ACCOUNT_SET_ASF_FLAGS.get(flag)
  if (mapped === undefined) {
    unsupported('AccountSet', `${field}(${flag})`)
  }
  return mapped
}

/**
 * Map an xrpl `AccountSet` to Custody's native `AccountSet` operation.
 * Custody models 8 of xrpl's `AccountSetAsfFlags` and no other field
 * (`Domain`, `EmailHash`, `MessageKey`, `WalletLocator`, `TickSize`,
 * `NFTokenMinter`, and any boolean `tf*` flag are all unsupported).
 *
 * @param tx - The `AccountSet` transaction.
 * @returns The Custody `AccountSet` operation.
 */
export function mapAccountSet(
  tx: AccountSet,
): components['schemas']['Core_XrplOperation_AccountSet'] {
  for (const field of [
    'Domain',
    'EmailHash',
    'MessageKey',
    'WalletLocator',
    'TickSize',
    'NFTokenMinter',
  ] as const) {
    if (tx[field] !== undefined) {
      unsupported('AccountSet', field)
    }
  }
  if (tx.Flags !== undefined && typeof tx.Flags !== 'number') {
    unsupported('AccountSet', 'Flags')
  }
  if (typeof tx.Flags === 'number' && tx.Flags !== 0) {
    unsupported('AccountSet', 'Flags')
  }
  return {
    type: 'AccountSet',
    setFlag:
      tx.SetFlag === undefined
        ? undefined
        : toAccountSetFlag('SetFlag', tx.SetFlag),
    clearFlag:
      tx.ClearFlag === undefined
        ? undefined
        : toAccountSetFlag('ClearFlag', tx.ClearFlag),
    transferRate: tx.TransferRate,
  }
}
