/**
 * Test scaffolding shared by the runnable examples — NOT production code.
 *
 * In a real app you omit `ledger` from `SimpleXRPL.init` and the SDK uses the
 * live XRPL connection. This in-memory stand-in lets the signing examples run
 * offline: it fills the network fields and reports a successful submission
 * without touching a network.
 */
import type {
  LedgerPort,
  SubmitResponse,
  Transaction,
  TxResponse,
} from 'simplexrpl'

/**
 * An in-memory {@link LedgerPort}: accepts any signed blob and reports success.
 *
 * @returns A ledger that runs the pipeline offline.
 */
export function inMemoryLedger(): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => ({
      ...tx,
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 100,
    }),
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    submitAndWait: async (): Promise<TxResponse> =>
      ({
        result: { hash: 'MOCKHASH', meta: { TransactionResult: 'tesSUCCESS' } },
      }) as unknown as TxResponse,
    request: async <T>(): Promise<T> => ({}) as T,
  }
}
