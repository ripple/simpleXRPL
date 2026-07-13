import type { SubmitResponse, Transaction, TxResponse } from 'xrpl'

import type { LedgerPort } from '../../../src/index.js'

/** An in-memory {@link LedgerPort} that records submitted blobs. */
export interface FakeLedger extends LedgerPort {
  readonly submitted: string[]
}

/**
 * Build an offline ledger: `autofill` stamps network fields, `submitAndWait`
 * records the blob and returns a canned response with `hash`.
 *
 * @param hash - The transaction hash the fake reports.
 * @returns A fake ledger port.
 */
export function fakeLedger(hash = 'FAKEHASH'): FakeLedger {
  const submitted: string[] = []
  return {
    submitted,
    autofill: async (tx: Transaction): Promise<Transaction> => ({
      ...tx,
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 100,
    }),
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    async submitAndWait(blob: string): Promise<TxResponse> {
      submitted.push(blob)
      return { result: { hash } } as unknown as TxResponse
    },
    request: async <T>(): Promise<T> => ({}) as T,
  }
}
