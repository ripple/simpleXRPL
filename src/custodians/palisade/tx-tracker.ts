import type {
  Custodian,
  CustodianKind,
  SubmissionHandle,
  SubmissionResult,
} from '../../domain/index.js'
import { IntentPendingError, SimpleXRPLError } from '../../errors.js'
import type { components } from '../../generated/palisade.js'
import type { PollSchedule } from '../poll-schedule.js'
import { pollDelayMs } from '../poll-schedule.js'

import type { PalisadeHttpClient } from './transport/palisade-http-client.js'

type PalisadeTransaction = components['schemas']['transactionsv2Transaction']

/**
 * Poll cadence: responsive for the first few seconds, then backing off so an
 * hour-long governance wait costs on the order of a hundred requests rather
 * than thousands. See {@link pollDelayMs}.
 */
const POLL_SCHEDULE: PollSchedule = { initialMs: 1500, maxMs: 30_000 }
const TERMINAL_SUCCESS = 'CONFIRMED'
const TERMINAL_FAILURE: ReadonlySet<string> = new Set(['REJECTED', 'FAILED'])

/**
 * Tracks a submitted Palisade transaction to a terminal status: polling,
 * handle construction, and result mapping. Split out of {@link PalisadeCustody}
 * so the submit paths stay small and the transport-polling concern is exercised
 * in isolation.
 */
export class PalisadeTxTracker {
  private readonly client: PalisadeHttpClient
  private readonly kind: CustodianKind
  private readonly timeoutMs: number

  /**
   * Construct a tracker.
   *
   * @param client - The authenticated Palisade client.
   * @param kind - The owning custodian's kind (stamped onto handles).
   * @param timeoutMs - Default bounded-wait budget.
   */
  public constructor(
    client: PalisadeHttpClient,
    kind: CustodianKind,
    timeoutMs: number,
  ) {
    this.client = client
    this.kind = kind
    this.timeoutMs = timeoutMs
  }

  /**
   * Build a {@link SubmissionHandle} over a pending Palisade transaction.
   *
   * @param custodian - The custodian that owns the handle.
   * @param pending - The pending submission coordinates.
   * @param pending.base - The wallet-relative transactions base path.
   * @param pending.submitted - The initial submit response.
   * @param pending.timeoutMs - Default bounded-wait budget for `wait()`.
   * @returns The handle.
   */
  public makeHandle(
    custodian: Custodian,
    pending: {
      base: string
      submitted: PalisadeTransaction
      timeoutMs?: number
    },
  ): SubmissionHandle {
    const { base, submitted, timeoutMs } = pending
    return {
      kind: this.kind,
      id: submitted.id,
      custodian,
      poll: async (): Promise<SubmissionResult> =>
        this.toResult(await this.fetch(base, submitted.id)),
      wait: async (ms?: number): Promise<SubmissionResult> =>
        this.toResult(
          await this.pollUntilTerminal(base, submitted, ms ?? timeoutMs),
        ),
      // TODO(palisade-cancel): no `cancel` yet. FreezeTransaction — the only
      // candidate — is rejected for a pending intent (`400 "cannot
      // freeze/unfreeze transaction"`, PAL010.008), and the API exposes no
      // reject/cancel-approval endpoint. Wire this up if Palisade adds a real
      // cancel path; until then we don't ship an untestable freeze-as-cancel.
    }
  }

  /**
   * Wrap a Palisade transaction as a `palisade`-sourced submission result.
   *
   * @param tx - The Palisade transaction.
   * @returns The submission result.
   */
  // eslint-disable-next-line class-methods-use-this -- shapes only its argument
  public toResult(tx: PalisadeTransaction): SubmissionResult {
    return {
      source: 'palisade',
      response: tx,
      intent: undefined,
      intentId: tx.id,
      txHash: tx.hash,
    }
  }

  /**
   * Poll a submitted transaction until it reaches a terminal status.
   *
   * @param base - The wallet-relative transactions base path.
   * @param submitted - The initial submit response.
   * @param timeoutMs - Optional per-call timeout override.
   * @returns The terminal transaction.
   * @throws {@link IntentPendingError} on timeout; {@link SimpleXRPLError} on failure.
   */
  public async pollUntilTerminal(
    base: string,
    submitted: PalisadeTransaction,
    timeoutMs?: number,
  ): Promise<PalisadeTransaction> {
    return this.pollUntil(base, submitted, {
      timeoutMs,
      isDone: (tx) => tx.status === TERMINAL_SUCCESS,
    })
  }

  /**
   * Poll a raw (sign-only) transaction until its signature is available.
   * Palisade signs asynchronously: the initial POST can return before the
   * signing pipeline runs, and a sign-only request stops at `SIGNED` rather
   * than publishing — so waiting on {@link pollUntilTerminal} would never reach
   * `CONFIRMED`. This resolves as soon as `signedTransaction` is populated.
   *
   * @param base - The wallet-relative transactions base path.
   * @param submitted - The initial raw-sign response.
   * @param timeoutMs - Optional per-call timeout override.
   * @returns The transaction carrying the signed blob.
   * @throws {@link IntentPendingError} on timeout; {@link SimpleXRPLError} on failure.
   */
  public async pollUntilSigned(
    base: string,
    submitted: PalisadeTransaction,
    timeoutMs?: number,
  ): Promise<PalisadeTransaction> {
    return this.pollUntil(base, submitted, {
      timeoutMs,
      isDone: (tx) => tx.signedTransaction !== undefined,
    })
  }

  /**
   * Fetch a single Palisade transaction by id.
   *
   * @param base - The wallet-relative transactions base path.
   * @param id - The transaction id.
   * @returns The transaction.
   * @throws A `PalisadeApiError` if the API rejects the fetch (e.g. 404).
   */
  public async fetch(base: string, id: string): Promise<PalisadeTransaction> {
    // GET returns the transaction directly (not wrapped in `{ transaction }`).
    return this.client.get<PalisadeTransaction>(`${base}/${id}`)
  }

  /**
   * Poll a submitted transaction until `isDone` holds, sleeping between GETs.
   * A `REJECTED`/`FAILED` status short-circuits as an error before the timeout.
   *
   * @param base - The wallet-relative transactions base path.
   * @param submitted - The initial submit response.
   * @param options - Per-call timeout override and the completion predicate.
   * @param options.timeoutMs - Optional per-call timeout override.
   * @param options.isDone - Predicate marking the desired terminal state.
   * @returns The transaction once `isDone` holds.
   * @throws {@link IntentPendingError} on timeout; {@link SimpleXRPLError} on failure.
   */
  private async pollUntil(
    base: string,
    submitted: PalisadeTransaction,
    options: {
      timeoutMs: number | undefined
      isDone: (tx: PalisadeTransaction) => boolean
    },
  ): Promise<PalisadeTransaction> {
    const { timeoutMs, isDone } = options
    // Deadline-based rather than a fixed attempt count: with a backing-off
    // delay, "number of polls" no longer maps to elapsed time, and the caller's
    // budget is expressed in time.
    const deadline = Date.now() + (timeoutMs ?? this.timeoutMs)
    let current = submitted
    for (let attempt = 0; ; attempt += 1) {
      if (TERMINAL_FAILURE.has(current.status)) {
        // Include whatever context Palisade attached. The bare
        // "<id> REJECTED" gives the caller nothing to act on — not which
        // operation, not why — and the transaction is only readable again
        // through credentials the caller may not have.
        const attributes = Object.entries(current.attributes ?? {})
          .map(([key, value]) => `${key}=${value}`)
          .join(', ')
        const context = [`action=${current.action}`, attributes]
          .filter((part) => part !== '')
          .join(', ')
        throw new SimpleXRPLError(
          `Palisade transaction ${current.id} ${current.status} (${context})`,
        )
      }
      if (isDone(current)) {
        return current
      }
      const delay = pollDelayMs(attempt, POLL_SCHEDULE)
      if (Date.now() + delay >= deadline) {
        throw new IntentPendingError(
          current.id,
          'palisade-custody',
          current.status,
        )
      }
      // eslint-disable-next-line no-await-in-loop -- sequential poll by design
      await new Promise((resolve) => {
        setTimeout(resolve, delay)
      })
      // eslint-disable-next-line no-await-in-loop -- sequential poll by design
      current = await this.fetch(base, current.id)
    }
  }
}
