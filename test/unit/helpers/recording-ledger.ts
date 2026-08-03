import { Wallet } from 'xrpl'
import type { SubmitResponse, Transaction, TxResponse } from 'xrpl'

import { LocalSigner, SimpleXRPL } from '../../../src/index.js'
import type { LedgerPort, SimpleXRPLClient } from '../../../src/index.js'

/** A client backed by a fake ledger that records the transactions built. */
export interface RecordingFixture {
  readonly client: SimpleXRPLClient
  readonly txs: Transaction[]
  readonly signers: readonly Wallet[]

  /** Addresses passed to the fake faucet (records `Account.fund` calls). */
  readonly fauceted: string[]
}

/**
 * Build a client whose ledger records every transaction passed to `autofill`
 * (so tests can assert the built transaction shape) and returns a canned
 * submit response carrying the given `meta`.
 *
 * @param options - Optional settings.
 * @param options.meta - `meta` returned by the fake `submitAndWait`.
 * @param options.signerCount - Number of local signers to fund (default 1).
 * @returns The client, the recorded transactions, and the signer wallets.
 */
export async function recordingClient(options?: {
  meta?: unknown
  signerCount?: number
}): Promise<RecordingFixture> {
  const txs: Transaction[] = []
  const fauceted: string[] = []
  const meta = options?.meta
  const ledger: LedgerPort = {
    async autofill(tx: Transaction): Promise<Transaction> {
      txs.push(tx)
      return {
        ...tx,
        Sequence: 1,
        Fee: '12',
        LastLedgerSequence: 100,
      }
    },
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    submitAndWait: async (): Promise<TxResponse> =>
      ({ result: { hash: 'HASH', meta } }) as unknown as TxResponse,
    request: async <T>(): Promise<T> => ({}) as T,
    async fundViaFaucet(address: string): Promise<void> {
      fauceted.push(address)
    },
  }
  const signers = Array.from({ length: options?.signerCount ?? 1 }, () =>
    Wallet.generate(),
  )
  const client = await SimpleXRPL.init({
    xrpldUrl: 'wss://x.invalid',
    signers: signers.map((wallet) =>
      LocalSigner.fromSeed(wallet.seed as string),
    ),
    ledger,
  })
  return { client, txs, signers, fauceted }
}
