import { decode, decodeAccountID } from 'xrpl'

import type { OnChainResult } from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'
import type { PollSchedule } from '../../poll-schedule.js'
import { pollDelayMs } from '../../poll-schedule.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiTransaction = components['schemas']['Core_ApiTransaction']
type TransactionsCollection =
  components['schemas']['Core_TransactionsCollection']

/** Poll cadence for ledger confirmation, backing off. See {@link pollDelayMs}. */
const POLL_SCHEDULE: PollSchedule = { initialMs: 5000, maxMs: 30_000 }

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
 * Recover an `MPTokenIssuanceID` from a signed `MPTokenIssuanceCreate` blob.
 *
 * Custody can report a transaction as `Confirmed` while leaving the structured
 * `ledgerData` null, so the issuance id isn't always readable from `tokenData`.
 * It is deterministic, though: the id is the creating transaction's `Sequence`
 * (4-byte big-endian) followed by the 20-byte issuer account id. We reconstruct
 * it from the signed `rawTransaction` when the structured field is missing.
 *
 * @param rawTransaction - The signed transaction blob (hex), if present.
 * @returns The 192-bit issuance id (hex), or `undefined` when the blob is
 *   absent, undecodable, or not an `MPTokenIssuanceCreate` bearing a sequence.
 */
function mptIssuanceIdFromRaw(
  rawTransaction: string | undefined,
): string | undefined {
  if (rawTransaction === undefined) {
    return undefined
  }
  let tx: ReturnType<typeof decode>
  try {
    tx = decode(rawTransaction)
  } catch {
    return undefined
  }
  if (
    tx.TransactionType !== 'MPTokenIssuanceCreate' ||
    typeof tx.Account !== 'string' ||
    typeof tx.Sequence !== 'number' ||
    tx.Sequence === 0
  ) {
    return undefined
  }
  const sequence = tx.Sequence
  const account = tx.Account
  const sequenceHex = sequence.toString(16).toUpperCase().padStart(8, '0')
  const accountIdHex = Buffer.from(decodeAccountID(account))
    .toString('hex')
    .toUpperCase()
  return `${sequenceHex}${accountIdHex}`
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
  // Prefer Custody's structured issuance id; fall back to reconstructing it
  // from the signed blob, which stays populated even when `ledgerData` is null.
  const mptIssuanceId =
    (onLedger?.type === 'Xrpl' ? onLedger.tokenData?.issuanceId : undefined) ??
    mptIssuanceIdFromRaw(ledgerData?.rawTransaction)
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

  for (let attempt = 0; ; attempt += 1) {
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

    const delay = pollDelayMs(attempt, POLL_SCHEDULE)
    if (Date.now() + delay >= deadline) {
      return undefined
    }
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for ledger confirmation.
    await sleep(delay)
  }
}
