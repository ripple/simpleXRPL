import type { Transaction } from 'xrpl'

import type { SubmissionContext } from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'
import { uuidV7 } from '../../../ids/index.js'
import type { PollSchedule } from '../../poll-schedule.js'
import { pollDelayMs } from '../../poll-schedule.js'
import type { CustodyApi } from '../api.js'
import type { RippleCustodyState } from '../construction.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiTransfer = components['schemas']['Core_ApiTransfer']
type TransfersCollection = components['schemas']['Core_TransfersCollection']

/**
 * Transactors that move tokens and can therefore produce a quarantinable
 * transfer. Auto-release only runs for these, so non-movement transactors (e.g.
 * AccountSet, TrustSet) don't pay the detection poll.
 */
export const TOKEN_MOVEMENT_TRANSACTORS: ReadonlySet<string> = new Set([
  'Payment',
])

/** Parameters for a manual quarantine release. */
export interface ReleaseQuarantineParams {
  /** The custodied account holding the quarantined transfers. */
  readonly accountId: string
  /** The transfer ids to release. */
  readonly transferIds: readonly string[]
}

/**
 * Poll cadence while waiting for compliance to decide a transaction's transfers.
 * Starts responsive (a verdict is often quick) and backs off. See
 * {@link pollDelayMs}.
 */
const POLL_SCHEDULE: PollSchedule = { initialMs: 2000, maxMs: 15_000 }

/** Inputs for {@link autoReleaseQuarantined}. */
export interface AutoReleaseOptions {
  /** The authenticated Custody client (for reading transfers). */
  readonly client: CustodyHttpClient
  /** The propose surface used to submit the release intents. */
  readonly api: CustodyApi
  /** The Custody domain the transaction belongs to. */
  readonly domainId: string
  /** The Custody transaction whose transfers to inspect. */
  readonly transactionId: string
  /** How long to wait for compliance to decide before giving up. */
  readonly timeoutMs: number
}

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
 * The custodied account a quarantined transfer should be released under:
 * the recipient when it's a custodied `Account`, else the first custodied
 * `Account` sender. `undefined` when neither party is custodied (an external
 * transfer the SDK can't release).
 *
 * @param transfer - The transfer to inspect.
 * @returns The custodied account UUID, or `undefined`.
 */
function custodiedAccountId(transfer: ApiTransfer): string | undefined {
  if (transfer.recipient?.type === 'Account') {
    return transfer.recipient.accountId
  }
  return transfer.senders.find((sender) => sender.type === 'Account')?.accountId
}

/**
 * List every transfer Custody has recorded for `transactionId`, following
 * pagination to completion.
 *
 * @param options - The client, domain, and transaction id.
 * @returns All transfers linked to the transaction.
 */
async function listTransfersForTransaction(
  options: AutoReleaseOptions,
): Promise<ApiTransfer[]> {
  const { client, domainId, transactionId } = options
  const path = `/v1/domains/${domainId}/transactions/transfers`
  const transfers: ApiTransfer[] = []
  let startingAfter: string | undefined
  do {
    // eslint-disable-next-line no-await-in-loop -- pagination is inherently sequential
    const page = await client.get<TransfersCollection>(path, {
      transactionId,
      startingAfter,
    })
    transfers.push(...page.items)
    // Custody returns a literal `null` for `nextStartingAfter` on the last page
    // (the generated type says `string`), so coalesce null/'' to a stop — an
    // `!== undefined` check alone would loop forever.
    const next: string | null | undefined = page.nextStartingAfter
    startingAfter = next ?? undefined
  } while (startingAfter !== undefined && startingAfter !== '')
  return transfers
}

/**
 * Whether compliance has ruled on every transfer: at least one transfer exists
 * and all carry a resolved `quarantineStatus` (Quarantined/Released/Skipped).
 *
 * @param transfers - The transaction's transfers.
 * @returns `true` once every transfer's status is decided.
 */
function allDecided(transfers: ApiTransfer[]): boolean {
  return (
    transfers.length > 0 &&
    transfers.every((transfer) => transfer.quarantineStatus !== undefined)
  )
}

/**
 * Poll a transaction's transfers until compliance has decided them all, or the
 * timeout elapses, then return only those it quarantined. Since quarantine is
 * applied asynchronously after settlement, this is the wait that bridges the gap
 * — non-movement transactions simply never surface a transfer and time out to an
 * empty result.
 *
 * @param options - The client, domain, transaction id, and timeout.
 * @returns The transfers compliance quarantined (possibly empty).
 */
async function pollQuarantinedTransfers(
  options: AutoReleaseOptions,
): Promise<ApiTransfer[]> {
  const deadline = Date.now() + options.timeoutMs
  for (let attempt = 0; ; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- sequential polling is inherent to the wait
    const transfers = await listTransfersForTransaction(options)
    const quarantined = transfers.filter(
      (transfer) => transfer.quarantineStatus === 'Quarantined',
    )
    if (allDecided(transfers)) {
      return quarantined
    }
    const delay = pollDelayMs(attempt, POLL_SCHEDULE)
    if (Date.now() + delay >= deadline) {
      // Out of time: release whatever is already quarantined, best-effort.
      return quarantined
    }
    // eslint-disable-next-line no-await-in-loop -- sequential polling is inherent to the wait
    await sleep(delay)
  }
}

/**
 * Propose a release intent per custodied account, batching that account's
 * quarantined transfer ids into one intent. Each release id is generated here
 * (and passed as the intent id) so it can be surfaced for the caller to track;
 * transfers with no custodied party are skipped.
 *
 * @param api - The propose surface.
 * @param transfers - The quarantined transfers to release.
 * @returns The generated release intent ids.
 */
async function proposeReleases(
  api: CustodyApi,
  transfers: ApiTransfer[],
): Promise<string[]> {
  const byAccount = new Map<string, string[]>()
  for (const transfer of transfers) {
    const accountId = custodiedAccountId(transfer)
    if (accountId !== undefined) {
      const ids = byAccount.get(accountId) ?? []
      ids.push(transfer.id)
      byAccount.set(accountId, ids)
    }
  }
  return Promise.all(
    Array.from(byAccount, async ([accountId, transferIds]) => {
      const intentId = uuidV7()
      await api.propose(
        { accountId, transferIds, type: 'v0_ReleaseQuarantinedTransfers' },
        { id: intentId },
      )
      return intentId
    }),
  )
}

/**
 * Detect the transfers a confirmed transaction produced that compliance
 * quarantined, and auto-propose their release (grouped by custodied account).
 * Proposes only — each release still runs the account's approval policy.
 *
 * @param options - The client, propose surface, domain, transaction id, and
 *   timeout.
 * @returns The proposed release intent ids (empty when nothing was quarantined).
 */
export async function autoReleaseQuarantined(
  options: AutoReleaseOptions,
): Promise<string[]> {
  const quarantined = await pollQuarantinedTransfers(options)
  if (quarantined.length === 0) {
    return []
  }
  return proposeReleases(options.api, quarantined)
}

/** Inputs for {@link runAutoRelease}. */
export interface RunAutoReleaseInput {
  /** The custodian state (enable flag, timeout, domain, client). */
  readonly state: RippleCustodyState
  /** The propose surface. */
  readonly api: CustodyApi
  /** The submitted transaction; its type gates whether auto-release runs. */
  readonly tx: Transaction
  /** The submission context (carries the per-call override). */
  readonly ctx: SubmissionContext
  /** The Custody transaction id, if the transaction produced one. */
  readonly transactionId: string | undefined
}

/**
 * The `submitAndWait` hook: run auto-release for a just-confirmed transaction
 * when it's enabled, moves tokens, and yielded a Custody transaction id.
 * Best-effort — the transaction already confirmed on-chain, so a detection or
 * propose failure is swallowed rather than surfaced as a failed submission.
 *
 * @param input - The custodian state, propose surface, transaction, context,
 *   and the Custody transaction id (if one was produced).
 * @returns The proposed release intent ids, or `undefined` when it didn't run.
 */
export async function runAutoRelease(
  input: RunAutoReleaseInput,
): Promise<readonly string[] | undefined> {
  const { state, api, tx, ctx, transactionId } = input
  const enabled = ctx.autoReleaseQuarantine ?? state.autoReleaseQuarantine
  if (
    !enabled ||
    !TOKEN_MOVEMENT_TRANSACTORS.has(tx.TransactionType) ||
    transactionId === undefined
  ) {
    return undefined
  }
  try {
    return await autoReleaseQuarantined({
      client: state.client,
      api,
      domainId: state.domainId,
      transactionId,
      timeoutMs: state.quarantinePollTimeoutMs,
    })
  } catch {
    return undefined
  }
}

/**
 * Propose a release for a caller-supplied set of quarantined transfers. Backs
 * the public `releaseQuarantinedTransfers` — for manual release or the async
 * submission path, which the inline hook doesn't cover.
 *
 * @param api - The propose surface.
 * @param params - The account and transfer ids to release.
 * @returns The generated release intent id, for tracking.
 */
export async function proposeQuarantineRelease(
  api: CustodyApi,
  params: ReleaseQuarantineParams,
): Promise<string> {
  const intentId = uuidV7()
  await api.propose(
    {
      accountId: params.accountId,
      transferIds: Array.from(params.transferIds),
      type: 'v0_ReleaseQuarantinedTransfers',
    },
    { id: intentId },
  )
  return intentId
}
