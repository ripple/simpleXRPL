import type { SubmitResponse, Transaction, TxResponse } from 'xrpl'

import type { LedgerPort, LedgerRequest } from '../../../src/index.js'

/** An in-memory {@link LedgerPort} that records submitted blobs. */
export interface FakeLedger extends LedgerPort {
  readonly submitted: string[]
}

/**
 * Per-ledger overrides for how a `tx` lookup resolves. `txResult` is the engine
 * result a `tx` lookup reports for the (validated) transaction; it defaults to
 * `tesSUCCESS`. Set a `tec*`/`tem*` code to exercise the on-ledger success gate.
 */
export interface FakeLedgerOptions {
  readonly txResult?: string
}

/**
 * Build an offline ledger: `autofill` stamps network fields, `submitAndWait`
 * records the blob and returns a canned response with `hash`, and a `tx`
 * `request` reports the transaction as validated with a `tesSUCCESS` (or the
 * overridden) engine result.
 *
 * @param hash - The transaction hash the fake reports.
 * @param options - Overrides for the `tx` lookup result.
 * @returns A fake ledger port.
 */
export function fakeLedger(
  hash = 'FAKEHASH',
  options: FakeLedgerOptions = {},
): FakeLedger {
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
    async request<T>(req: LedgerRequest): Promise<T> {
      if (req.command === 'tx') {
        return {
          result: {
            hash,
            validated: true,
            meta: { TransactionResult: options.txResult ?? 'tesSUCCESS' },
          },
        } as unknown as T
      }
      return {} as T
    },
  }
}
