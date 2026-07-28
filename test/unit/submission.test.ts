import type { TxResponse } from 'xrpl'

import type { SubmissionResult } from '../../src/index.js'

// Exercises discriminated-union narrowing on `source` at compile + run time.
function describeResult(result: SubmissionResult): string {
  switch (result.source) {
    case 'xrpld':
      // `response` is narrowed to TxResponse here.
      return result.response.type
    case 'custody':
      return 'custody'
    case 'palisade':
      return 'palisade'
    default:
      return 'unknown'
  }
}

describe('SubmissionResult', () => {
  it('narrows the xrpld variant to a TxResponse', () => {
    const result: SubmissionResult = {
      source: 'xrpld',
      intent: undefined,
      txHash: 'ABC',
      response: { type: 'response' } as unknown as TxResponse,
    }
    expect(describeResult(result)).toBe('response')
    expect(result.txHash).toBe('ABC')
  })

  it('carries an intentId on a custody result', () => {
    const result: SubmissionResult<{ tokenId: string }> = {
      source: 'custody',
      intent: { tokenId: 'tok-1' },
      intentId: 'intent-1',
      response: { status: 'Executed' },
    }
    expect(describeResult(result)).toBe('custody')
    expect(result.intent.tokenId).toBe('tok-1')
    expect(result.intentId).toBe('intent-1')
  })

  it('carries an intentId on a palisade result', () => {
    const result: SubmissionResult = {
      source: 'palisade',
      intent: undefined,
      intentId: 'txn-1',
      response: { transactionId: 'txn-1' },
    }
    expect(describeResult(result)).toBe('palisade')
    expect(result.intentId).toBe('txn-1')
  })
})
