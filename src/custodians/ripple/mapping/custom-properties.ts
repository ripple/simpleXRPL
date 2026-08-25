import type { Transaction } from 'xrpl'

import type { components } from '../../../generated/custody.js'

type StringsMap = components['schemas']['Core_StringsMap']

/**
 * Render an xrpl `Amount`-shaped value for a human approver.
 *
 * @param amount - The transaction's `Amount` field (drops string, IOU, or MPT).
 * @returns A human-readable description, or `undefined` for an unrecognized shape.
 */
function describeAmount(amount: unknown): string | undefined {
  if (typeof amount === 'string') {
    return `${amount} drops`
  }
  if (typeof amount === 'object' && amount !== null) {
    if ('mpt_issuance_id' in amount && 'value' in amount) {
      return `${String(amount.value)} (MPT ${String(amount.mpt_issuance_id)})`
    }
    if ('currency' in amount && 'value' in amount) {
      const issuer =
        'issuer' in amount ? ` issued by ${String(amount.issuer)}` : ''
      return `${String(amount.value)} ${String(amount.currency)}${issuer}`
    }
  }
  return undefined
}

/** Amount-shaped fields, keyed by the `customProperties` name they surface as. */
const AMOUNT_FIELDS = [
  ['amount', 'Amount'],
  ['limitAmount', 'LimitAmount'],
  ['takerGets', 'TakerGets'],
  ['takerPays', 'TakerPays'],
] as const

/**
 * Identifying string fields, surfaced verbatim so an approver can tell two
 * otherwise-similar transactions apart (e.g. which holder is being authorized).
 */
const STRING_FIELDS = [
  ['destination', 'Destination'],
  ['authorize', 'Authorize'],
  ['unauthorize', 'Unauthorize'],
  ['holder', 'Holder'],
  ['owner', 'Owner'],
  ['regularKey', 'RegularKey'],
  ['mptIssuanceId', 'MPTokenIssuanceID'],
  ['domainId', 'DomainID'],
] as const

/**
 * Build the free-form, human-readable `customProperties` block Custody
 * displays to approvers but never validates. Not a public contract —
 * approvers see plain text, so this only needs to be legible, not
 * machine-parseable.
 *
 * @param tx - The transaction the intent wraps.
 * @returns A small string-valued summary describing the transaction (operation,
 * account, and the fields most relevant to that transactor).
 */
export function buildCustomProperties(tx: Transaction): StringsMap {
  const props: Record<string, string> = {
    transactionType: tx.TransactionType,
    account: tx.Account,
  }
  for (const [propName, field] of STRING_FIELDS) {
    if (field in tx) {
      const value = tx[field]
      if (typeof value === 'string') {
        props[propName] = value
      }
    }
  }
  for (const [propName, field] of AMOUNT_FIELDS) {
    if (field in tx) {
      const description = describeAmount(tx[field])
      if (description !== undefined) {
        props[propName] = description
      }
    }
  }
  return props
}
