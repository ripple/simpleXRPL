import { Client } from 'xrpl'
import type {
  SubmittableTransaction,
  SubmitResponse,
  Transaction,
  TxResponse,
} from 'xrpl'

import type { LedgerPort, LedgerRequest } from '../ports/index.js'

/**
 * The production {@link LedgerPort}, wrapping an `xrpl` WebSocket client. Reads,
 * autofill, and Local/raw submission all flow through the one shared client.
 */
export class XrplLedger implements LedgerPort {
  private readonly client: Client

  /**
   * Wrap a new xrpl client bound to the given endpoint.
   *
   * @param rippledUrl - The rippled WebSocket endpoint.
   */
  public constructor(rippledUrl: string) {
    this.client = new Client(rippledUrl)
  }

  /** Open the WebSocket connection if it is not already open. */
  public async connect(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect()
    }
  }

  /** Close the WebSocket connection if it is open. */
  public async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect()
    }
  }

  /**
   * Fill network-derived fields via the client's autofill.
   *
   * @param tx - The transaction to complete.
   * @returns The autofilled transaction.
   */
  public async autofill(tx: Transaction): Promise<Transaction> {
    // The SDK only ever autofills submittable transactions (verticals never
    // build pseudo-transactions); narrow for the client's stricter parameter.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- narrow to SubmittableTransaction
    return this.client.autofill(tx as SubmittableTransaction)
  }

  /**
   * Submit a signed transaction blob.
   *
   * @param signedTxBlob - The signed transaction blob (hex).
   * @returns The submit response.
   */
  public async submit(signedTxBlob: string): Promise<SubmitResponse> {
    return this.client.submit(signedTxBlob)
  }

  /**
   * Submit a signed blob and wait for a terminal ledger result.
   *
   * @param signedTxBlob - The signed transaction blob (hex).
   * @returns The transaction response.
   */
  public async submitAndWait(signedTxBlob: string): Promise<TxResponse> {
    return this.client.submitAndWait(signedTxBlob)
  }

  /**
   * Issue a raw ledger request.
   *
   * @param req - The ledger request.
   * @returns The typed response.
   */
  public async request<T>(req: LedgerRequest): Promise<T> {
    // The port exposes a generic request; xrpl types it against a per-command
    // union, so bridge the types at this single boundary.
    /* eslint-disable @typescript-eslint/consistent-type-assertions -- generic port over xrpl's per-command request typing */
    const response = await this.client.request(
      req as unknown as Parameters<Client['request']>[0],
    )
    return response as unknown as T
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }
}
