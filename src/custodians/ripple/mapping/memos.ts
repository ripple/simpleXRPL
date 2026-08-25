import type { Transaction } from 'xrpl'

import type { components } from '../../../generated/custody.js'

type XrplMemo = components['schemas']['Core_XrplMemo']

/**
 * Map an xrpl transaction's memos to Custody's memo list. A direct
 * field-for-field mapping — both sides use the same hex-encoded convention —
 * so nothing here is ever dropped or rejected.
 *
 * @param tx - The transaction whose memos are being mapped.
 * @returns The mapped memos, or `[]` if the transaction carries none.
 */
export function toMemos(tx: Transaction): XrplMemo[] {
  if (tx.Memos === undefined) {
    return []
  }
  return tx.Memos.map(({ Memo }) => ({
    memoData: Memo.MemoData,
    memoFormat: Memo.MemoFormat,
    memoType: Memo.MemoType,
  }))
}
