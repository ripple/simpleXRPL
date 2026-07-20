import { AccountSetAsfFlags } from 'xrpl'
import type { AccountSet } from 'xrpl'

import type { components, operations } from '../../../generated/palisade.js'

import { palisadeUnsupported } from './unsupported.js'

type AccountSetBody =
  operations['TransactionsService_SubmitAccountSet']['requestBody']['content']['application/json']
type AccountSetFlag = components['schemas']['transactionsv2AccountSetFlag']

/** xrpl `AccountSetAsfFlags` value → Palisade account-set flag enum. */
const ASF_TO_ENUM = new Map<number, AccountSetFlag>([
  [AccountSetAsfFlags.asfAccountTxnID, 'ACCOUNT_TXN_ID'],
  [AccountSetAsfFlags.asfAllowTrustLineClawback, 'ALLOW_TRUSTLINE_CLAWBACK'],
  [AccountSetAsfFlags.asfAuthorizedNFTokenMinter, 'AUTHZ_NFTOKEN_MINTER'],
  [AccountSetAsfFlags.asfDefaultRipple, 'DEFAULT_RIPPLE'],
  [AccountSetAsfFlags.asfDepositAuth, 'DEPOSIT_AUTH'],
  [AccountSetAsfFlags.asfDisableMaster, 'DISABLE_MASTER'],
  [AccountSetAsfFlags.asfDisallowIncomingCheck, 'DISALLOW_INCOMING_CHECK'],
  [AccountSetAsfFlags.asfDisallowIncomingPayChan, 'DISALLOW_INCOMING_PAY_CHAN'],
  [
    AccountSetAsfFlags.asfDisallowIncomingTrustline,
    'DISALLOW_INCOMING_TRUSTLINE',
  ],
  [AccountSetAsfFlags.asfDisallowXRP, 'DISALLOW_XRP'],
  [AccountSetAsfFlags.asfGlobalFreeze, 'GLOBAL_FREEZE'],
  [AccountSetAsfFlags.asfNoFreeze, 'NO_FREEZE'],
  [AccountSetAsfFlags.asfRequireAuth, 'REQUIRE_AUTH'],
  [AccountSetAsfFlags.asfRequireDest, 'REQUIRE_DEST'],
])

function toFlag(value: number, field: string): AccountSetFlag {
  const mapped = ASF_TO_ENUM.get(value)
  if (mapped === undefined) {
    palisadeUnsupported('AccountSet', `${field}(${value})`)
  }
  return mapped
}

/**
 * Map an `AccountSet` to Palisade's `SubmitAccountSet` body.
 *
 * @param tx - The AccountSet transaction.
 * @returns The Palisade submit body.
 */
export function mapAccountSet(tx: AccountSet): AccountSetBody {
  const body: AccountSetBody = {}
  if (tx.SetFlag !== undefined) {
    body.setFlag = toFlag(tx.SetFlag, 'SetFlag')
  }
  if (tx.ClearFlag !== undefined) {
    body.clearFlag = toFlag(tx.ClearFlag, 'ClearFlag')
  }
  if (tx.Domain !== undefined) {
    body.domain = tx.Domain
  }
  if (tx.TransferRate !== undefined) {
    body.transferRate = tx.TransferRate
  }
  if (tx.TickSize !== undefined) {
    body.tickSize = tx.TickSize
  }
  return body
}
