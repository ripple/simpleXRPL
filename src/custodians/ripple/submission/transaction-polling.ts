import type { OnChainResult } from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiTransaction = components['schemas']['Core_ApiTransaction']
type TransactionsCollection =
  components['schemas']['Core_TransactionsCollection']

const POLL_INTERVAL_MS = 5000

/**
 * Wait for `ms` milliseconds.
 *
 * @param ms - How long to wait.
 */
async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Extract the on-chain result fields from a confirmed Custody transaction.
 *
 * @param tx - A confirmed Custody API transaction.
 * @returns The XRPL tx hash, plus the MPT issuance ID if the transaction
 *   created one.
 */
function toOnChainResult(tx: ApiTransaction): OnChainResult {
  const ledgerData = tx.ledgerTransactionData
  const txHash = ledgerData?.ledgerTransactionId ?? ''
  const onLedger = ledgerData?.ledgerData
  const mptIssuanceId =
    onLedger?.type === 'Xrpl' ? onLedger.tokenData?.issuanceId : undefined
  return { txHash, ...(mptIssuanceId !== undefined && { mptIssuanceId }) }
}

/** Inputs for {@link pollTransactionOnChain}. */
export interface PollTransactionOptions {
  /** The authenticated Custody client. */
  readonly client: CustodyHttpClient
  /** The Custody domain the intent belongs to. */
  readonly domainId: string
  /** The intent/order ID to find the on-chain transaction for. */
  readonly intentId: string
  /** How long to poll before giving up. */
  readonly timeoutMs: number
}

/**
 * Poll `GET /v1/domains/{domainId}/transactions?orderReference.Id={intentId}`
 * until the linked on-chain transaction reaches `Confirmed` status, then
 * return its XRPL tx hash and any MPT issuance ID.
 *
 * The Ripple Custody order layer submits the XRPL transaction asynchronously
 * after the intent reaches `Executed`. This function bridges that gap: it waits
 * for ledger confirmation and reads the result directly from the Custody API —
 * no separate XRPL ledger query needed.
 *
 * @param options - The client, domain, intent id, and polling timeout.
 * @returns The on-chain result once confirmed, or `undefined` when the timeout
 *   elapses before confirmation.
 */
export async function pollTransactionOnChain(
  options: PollTransactionOptions,
): Promise<OnChainResult | undefined> {
  const { client, domainId, intentId, timeoutMs } = options
  const deadline = Date.now() + timeoutMs

  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for ledger confirmation.
    const collection = await client.get<TransactionsCollection>(
      `/v1/domains/${domainId}/transactions`,
      { 'orderReference.Id': intentId },
    )

    if (collection.count > 0) {
      const tx = collection.items[0]
      if (tx.ledgerTransactionData?.ledgerStatus === 'Confirmed') {
        return toOnChainResult(tx)
      }
    }

    if (Date.now() >= deadline) {
      return undefined
    }
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for ledger confirmation.
    await sleep(POLL_INTERVAL_MS)
  }
}
