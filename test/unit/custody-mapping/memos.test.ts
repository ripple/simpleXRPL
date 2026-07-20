import type { Payment } from 'xrpl'

import { toMemos } from '../../../src/custodians/ripple/mapping/memos.js'

describe('toMemos', () => {
  it('returns an empty list when the transaction carries no memos', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000000',
    }
    expect(toMemos(tx)).toEqual([])
  })

  it('maps each Memo to its Custody field names', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000000',
      Memos: [
        {
          Memo: {
            MemoData: '48656C6C6F',
            MemoFormat: '746578742F706C61696E',
            MemoType: '636F6D6D656E74',
          },
        },
        { Memo: { MemoData: 'ABCDEF' } },
      ],
    }
    expect(toMemos(tx)).toEqual([
      {
        memoData: '48656C6C6F',
        memoFormat: '746578742F706C61696E',
        memoType: '636F6D6D656E74',
      },
      { memoData: 'ABCDEF', memoFormat: undefined, memoType: undefined },
    ])
  })
})
