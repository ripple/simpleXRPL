import { decode, decodeAccountID } from 'xrpl'

import type { OnChainResult } from '../../../domain/index.js'
import { IntentValidationError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { PollSchedule } from '../../poll-schedule.js'
import { pollDelayMs } from '../../poll-schedule.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiTransaction = components['schemas']['Core_ApiTransaction']
type TransactionsCollection =
  components['schemas']['Core_TransactionsCollection']
type LedgerTransactionData = components['schemas']['Core_LedgerTransactionData']
type LedgerTransactionStatus =
  components['schemas']['Core_LedgerTransactionStatus']

/** Poll cadence for ledger confirmation, backing off. See {@link pollDelayMs}. */
const POLL_SCHEDULE: PollSchedule = { initialMs: 5000, maxMs: 30_000 }

/** Radix for hex-encoding the sequence when reconstructing an issuance id. */
const HEX_RADIX = 16

/** Hex-digit width of the 4-byte big-endian sequence prefix of an issuance id. */
const SEQUENCE_HEX_WIDTH = 8

/**
 * Ledger statuses a transaction can never leave for `Confirmed`: it aged out of
 * every ledger it could have applied in (`Expired`), or another transaction on
 * the same account sequence superseded it (`Replaced`). Either way it is dead —
 * polling on would only burn the full timeout waiting for a confirmation that
 * can no longer come.
 */
const TERMINAL_DEAD_STATUSES: ReadonlySet<LedgerTransactionStatus> = new Set([
  'Expired',
  'Replaced',
])

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
  const sequenceHex = sequence
    .toString(HEX_RADIX)
    .toUpperCase()
    .padStart(SEQUENCE_HEX_WIDTH, '0')
  const accountIdHex = Buffer.from(decodeAccountID(account))
    .toString('hex')
    .toUpperCase()
  return `${sequenceHex}${accountIdHex}`
}

/**
 * Classify a transaction's ledger state as provably dead, if it is. A dead
 * transaction has been permanently rejected by the ledger — it recorded an
 * on-chain `failure` (`FailedOnChain`, or `PartiallyFailedOnChain`, which is
 * not the clean success the caller asked for either), or it reached a terminal
 * `Expired`/`Replaced` status — so it can never become `Confirmed` no matter
 * how long we keep polling.
 *
 * @param ledgerData - The transaction's `ledgerTransactionData`.
 * @returns A short reason string when dead, else `undefined` (still in flight).
 */
function deadReason(ledgerData: LedgerTransactionData): string | undefined {
  // `failure` is typed as the failure enum but comes back as `null` while the
  // transaction is still in flight, so test truthiness — only a real failure
  // string (both values are non-empty) marks the transaction dead.
  if (ledgerData.failure) {
    return ledgerData.failure
  }
  if (TERMINAL_DEAD_STATUSES.has(ledgerData.ledgerStatus)) {
    return ledgerData.ledgerStatus
  }
  return undefined
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
 * The wait has three outcomes, mirroring the on-ledger reality:
 * - **Confirmed** — the transaction is on the ledger; its hash is returned.
 * - **Provably dead** — the transaction reached a terminal non-confirmed state
 *   (`Expired`, `Replaced`, or an on-chain `failure`). Polling on would only
 *   waste the timeout, so this throws {@link IntentValidationError} at once. It
 *   will never apply, so a retry is a genuinely new attempt and must use a
 *   fresh idempotency key.
 * - **Indeterminate** — still in flight when the timeout elapses; returns
 *   `undefined`. The transaction may yet confirm, so a retry must re-drive the
 *   *same* idempotency key rather than start a new attempt.
 *
 * @param options - The client, domain, intent id, and polling timeout.
 * @returns The on-chain result once confirmed, or `undefined` when the timeout
 *   elapses with the transaction still in flight.
 * @throws {@link IntentValidationError} if the transaction reaches a terminal
 *   non-confirmed state (provably dead).
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
      const ledgerData = tx.ledgerTransactionData
      // Check for a dead outcome *before* honoring `Confirmed`: Custody can mark
      // a transaction `Confirmed` (it reached the ledger) while also recording a
      // `failure` on it — not the clean success the caller asked for. A recorded
      // failure wins.
      // `ledgerTransactionData` is typed optional but comes back as `null` from
      // Custody while the transaction is still in flight, so a truthiness guard
      // covers both — keep polling rather than dereferencing a null.
      const dead = ledgerData ? deadReason(ledgerData) : undefined
      if (dead !== undefined) {
        throw new IntentValidationError(
          `Custody transaction for intent ${intentId} will not confirm ` +
            `on-chain (${dead}) — it is terminal. Retry only with a fresh ` +
            `idempotency key.`,
        )
      }
      if (ledgerData?.ledgerStatus === 'Confirmed') {
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
