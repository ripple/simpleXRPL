import { Client } from 'xrpl'
import type {
  SubmittableTransaction,
  SubmitResponse,
  Transaction,
  TxResponse,
} from 'xrpl'

import { SimpleXRPLError } from '../errors.js'
import type { LedgerPort, LedgerRequest } from '../ports/index.js'

/** Poll interval and cap while waiting for a faucet-funded account to appear. */
const FAUCET_POLL_INTERVAL_MS = 1000
const FAUCET_POLL_ATTEMPTS = 20

/**
 * The production {@link LedgerPort}, wrapping an `xrpl` WebSocket client. Reads,
 * autofill, and Local/raw submission all flow through the one shared client.
 */
export class XrplLedger implements LedgerPort {
  private readonly client: Client

  private readonly faucetUrl: string | undefined

  /**
   * Wrap a new xrpl client bound to the given endpoint.
   *
   * @param rippledUrl - The rippled WebSocket endpoint.
   * @param faucetUrl - The faucet endpoint (testnet/devnet), enabling `fund`.
   */
  public constructor(rippledUrl: string, faucetUrl?: string) {
    this.client = new Client(rippledUrl)
    this.faucetUrl = faucetUrl
  }

  /**
   * Faucet-fund an address, resolving once it is visible on-ledger.
   *
   * @param address - The r-address to fund.
   * @throws {@link SimpleXRPLError} if no faucet is configured or funding fails.
   */
  public async fundViaFaucet(address: string): Promise<void> {
    if (this.faucetUrl === undefined) {
      throw new SimpleXRPLError(
        'This network has no faucet configured; Account.fund is testnet/devnet ' +
          'only. Use Account.activate to fund from an operator account.',
      )
    }
    const response = await fetch(this.faucetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: address }),
    })
    if (!response.ok) {
      throw new SimpleXRPLError(
        `Faucet request failed with status ${response.status}`,
      )
    }
    await this.waitForAccount(address)
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

  /**
   * Poll `account_info` until the address exists (newly funded accounts take a
   * ledger to settle) or the attempt budget is exhausted.
   *
   * @param address - The r-address to wait for.
   * @throws {@link SimpleXRPLError} if the account never appears in time.
   */
  private async waitForAccount(address: string): Promise<void> {
    for (let attempt = 0; attempt < FAUCET_POLL_ATTEMPTS; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential poll by design
        await this.request({ command: 'account_info', account: address })
        return
      } catch {
        // eslint-disable-next-line no-await-in-loop -- sequential poll by design
        await new Promise((resolve) => {
          setTimeout(resolve, FAUCET_POLL_INTERVAL_MS)
        })
      }
    }
    throw new SimpleXRPLError(
      `Faucet-funded account ${address} did not appear on-ledger in time`,
    )
  }
}
