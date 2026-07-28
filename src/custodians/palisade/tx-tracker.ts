import type {
  Custodian,
  CustodianKind,
  SubmissionHandle,
  SubmissionResult,
} from '../../domain/index.js'
import { IntentPendingError, SimpleXRPLError } from '../../errors.js'
import type { components } from '../../generated/palisade.js'

import type { PalisadeHttpClient } from './transport/palisade-http-client.js'

type PalisadeTransaction = components['schemas']['transactionsv2Transaction']

const POLL_INTERVAL_MS = 1500
const TERMINAL_SUCCESS = 'CONFIRMED'
const TERMINAL_FAILURE: ReadonlySet<string> = new Set(['REJECTED', 'FAILED'])

/**
 * Tracks a submitted Palisade transaction to a terminal status: polling,
 * handle construction, result mapping, and the freeze-as-cancel action. Split
 * out of {@link PalisadeCustody} so the submit paths stay small and the
 * transport-polling concern is exercised in isolation.
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
      cancel: async (): Promise<void> => this.cancelPending(base, submitted.id),
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
    const attempts = Math.max(
      1,
      Math.ceil((timeoutMs ?? this.timeoutMs) / POLL_INTERVAL_MS),
    )
    let current = submitted
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (current.status === TERMINAL_SUCCESS) {
        return current
      }
      if (TERMINAL_FAILURE.has(current.status)) {
        throw new SimpleXRPLError(
          `Palisade transaction ${current.id} ${current.status}`,
        )
      }
      if (attempt + 1 < attempts) {
        // eslint-disable-next-line no-await-in-loop -- sequential poll by design
        await new Promise((resolve) => {
          setTimeout(resolve, POLL_INTERVAL_MS)
        })
        // GET returns the transaction directly (not wrapped in `{ transaction }`).
        // eslint-disable-next-line no-await-in-loop -- sequential poll by design
        current = await this.client.get<PalisadeTransaction>(
          `${base}/${current.id}`,
        )
      }
    }
    throw new IntentPendingError(current.id, 'palisade-custody', current.status)
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
   * Cancel a still-pending transaction. Palisade exposes no hard cancel; the
   * closest is `FreezeTransaction`, a reversible compliance hold (custodial
   * orgs only). Rejects once the transaction is terminal.
   *
   * @param base - The wallet-relative transactions base path.
   * @param id - The transaction id.
   * @throws {@link SimpleXRPLError} if the transaction is already terminal.
   */
  private async cancelPending(base: string, id: string): Promise<void> {
    const current = await this.fetch(base, id)
    if (
      current.status === TERMINAL_SUCCESS ||
      TERMINAL_FAILURE.has(current.status)
    ) {
      throw new SimpleXRPLError(
        `Cannot cancel Palisade transaction ${id}: already ${current.status}`,
      )
    }
    await this.client.put(`${base}/${id}/freeze`, {
      reason: 'Cancelled via simpleXRPL',
    })
  }
}
