import type { SubmitResponse, Transaction, TxResponse } from 'xrpl'

/**
 * A raw ledger request, mirroring the shape the xrpl client accepts.
 */
export interface LedgerRequest {
  /** Command-specific parameters. */
  readonly [key: string]: unknown

  /** The xrpld command, e.g. `'account_info'`. */
  readonly command: string
}

/**
 * The subset of the xrpl client the SDK depends on, injected so the local
 * and raw-signing paths can run against an in-memory ledger in tests.
 */
export interface LedgerPort {
  /** Fill network-derived fields (sequence, fee, last ledger sequence). */
  readonly autofill: (tx: Transaction) => Promise<Transaction>

  /** Submit a signed transaction blob. */
  readonly submit: (signedTxBlob: string) => Promise<SubmitResponse>

  /** Submit a signed blob and wait for the transaction to reach terminal state. */
  readonly submitAndWait: (signedTxBlob: string) => Promise<TxResponse>

  /** Issue a raw ledger request and resolve with the typed response. */
  readonly request: <T>(req: LedgerRequest) => Promise<T>

  /**
   * Faucet-fund an address, resolving once it exists on-ledger. Present only on
   * networks with a faucet (testnet/devnet); absent implementations mean
   * `Account.fund` is unavailable and callers should use `Account.activate`.
   */
  readonly fundViaFaucet?: (address: string) => Promise<void>

  /** Open the connection, if the implementation is connection-oriented. */
  readonly connect?: () => Promise<void>

  /** Close the connection, if the implementation is connection-oriented. */
  readonly disconnect?: () => Promise<void>
}
