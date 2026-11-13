import {
  CustodyApiError,
  CustodyTimeoutError,
  IntentPendingError,
  IntentValidationError,
} from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { PollSchedule } from '../../poll-schedule.js'
import { pollDelayMs } from '../../poll-schedule.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type TrustedIntent = components['schemas']['Core_TrustedIntent']
type IntentEntity = components['schemas']['Core_IntentEntity']
type IntentStatus = components['schemas']['Core_IntentStatus']

/**
 * Poll cadence: responsive at first, then backing off so a long governance wait
 * (a multi-step step may wait on a human approval for the best part of an hour)
 * costs a manageable number of requests. See {@link pollDelayMs}.
 */
const POLL_SCHEDULE: PollSchedule = { initialMs: 1000, maxMs: 30_000 }
const HTTP_NOT_FOUND = 404

/**
 * Reported as the last state when the intent never became readable. Not a
 * `Core_IntentStatus` — deliberately, because no status was ever observed;
 * inventing one would misreport the intent as having reached a state it may
 * never have been in.
 */
const NOT_YET_VISIBLE = 'NotYetVisible'

/** Statuses that end the intent's lifecycle without executing it. */
const TERMINAL_FAILURE_STATUSES: ReadonlySet<IntentStatus> = new Set([
  'Rejected',
  'Expired',
  'Failed',
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
 * Describe an intent's terminal failure for the thrown error message.
 *
 * @param intentId - The intent id, for the message.
 * @param state - The intent's terminal (non-executed) state.
 * @returns A human-readable description of the failure.
 */
function describeFailure(
  intentId: string,
  state: components['schemas']['Core_IntentState'],
): string {
  const detail =
    state.error === undefined
      ? ''
      : ` (${state.error.code}: ${state.error.message})`
  return `Custody intent ${intentId} did not execute: status=${state.status}${detail}`
}

/**
 * Fetch one intent's current entity, without polling: the
 * non-blocking snapshot behind a handle's `poll()` and `client.intent.status`.
 * Unlike {@link pollIntentUntilExecuted}, it never loops and never throws on a
 * terminal-failure status — the caller reads `state.status` from the entity.
 *
 * @param client - The authenticated Custody client.
 * @param domainId - The Custody domain the intent belongs to.
 * @param intentId - The intent id to read.
 * @returns The current intent entity.
 */
export async function fetchIntent(
  client: CustodyHttpClient,
  domainId: string,
  intentId: string,
): Promise<IntentEntity> {
  const trusted = await client.get<TrustedIntent>(
    `/v1/domains/${domainId}/intents/${intentId}`,
  )
  return trusted.data
}

/**
 * How an intent wait ended. Reported, never thrown: a rejected, expired, or
 * failed intent and a wait that ran out of time are all answers, so the caller
 * reads them from `isSuccess` / `isTerminal`, with `reason` saying the same in
 * one sentence.
 */
export interface IntentOutcome {
  /** The intent waited on. */
  readonly intentId: string
  /** The last status seen; `undefined` if the intent was never readable. */
  readonly status: IntentStatus | undefined
  /** Whether the intent reached the end of its lifecycle. */
  readonly isTerminal: boolean
  /** Whether it ended `Executed`. */
  readonly isSuccess: boolean
  /**
   * Why the wait didn't succeed, in one sentence — `undefined` exactly when
   * `isSuccess` is true. Set when the wait ran out of time too: an intent still
   * `Open` is most likely waiting for an approval.
   */
  readonly reason: string | undefined
  /** The last intent read; `undefined` if it was never readable. */
  readonly intent: TrustedIntent | undefined
}

/** Inputs for {@link waitForIntentOutcome}. */
export interface WaitForIntentOptions {
  /** Reads the intent once (`GET /v1/domains/{domainId}/intents/{intentId}`). */
  readonly readIntent: () => Promise<TrustedIntent>
  /** The intent id, for the outcome and its reason. */
  readonly intentId: string
  /** How long to wait before reporting the intent as still in progress. */
  readonly timeoutMs: number
  /** Called with each status read, and the attempt number (from 1). */
  readonly onStatusCheck?: (status: IntentStatus, attempt: number) => void
}

/**
 * Explain an intent still in progress when the wait ran out.
 *
 * @param intentId - The intent id.
 * @param status - Its last status, if it was ever readable.
 * @param timeoutMs - How long the wait ran.
 * @returns The reason.
 */
function describeUnfinished(
  intentId: string,
  status: IntentStatus | undefined,
  timeoutMs: number,
): string {
  if (status === undefined) {
    return `Custody intent ${intentId} was not readable within ${timeoutMs} ms; check the intent id and domain`
  }
  const approval =
    status === 'Open' ? '; it is most likely waiting for an approval' : ''
  return `Custody intent ${intentId} is still ${status} after ${timeoutMs} ms${approval}`
}

/**
 * Read the intent once, treating a 404 as "not readable yet" and a timed-out
 * read as "no answer this time".
 *
 * @param readIntent - Reads the intent.
 * @returns The intent, or `undefined` on a 404 or a timeout.
 * @throws Whatever reading the intent throws, other than a 404 or a timeout.
 */
async function readIfVisible(
  readIntent: () => Promise<TrustedIntent>,
): Promise<TrustedIntent | undefined> {
  try {
    return await readIntent()
  } catch (error) {
    // A read that timed out says nothing about the intent: try again.
    if (
      (error instanceof CustodyApiError && error.status === HTTP_NOT_FOUND) ||
      error instanceof CustodyTimeoutError
    ) {
      return undefined
    }
    throw error
  }
}

/**
 * The outcome of an intent that has finished, or `undefined` if it hasn't.
 *
 * @param intentId - The intent id.
 * @param intent - The intent as last read.
 * @returns The terminal outcome, if the intent is terminal.
 */
function terminalOutcome(
  intentId: string,
  intent: TrustedIntent,
): IntentOutcome | undefined {
  const { status } = intent.data.state
  const isSuccess = status === 'Executed'
  if (!isSuccess && !TERMINAL_FAILURE_STATUSES.has(status)) {
    return undefined
  }
  return {
    intentId,
    status,
    isTerminal: true,
    isSuccess,
    reason: isSuccess
      ? undefined
      : describeFailure(intentId, intent.data.state),
    intent,
  }
}

/**
 * Wait for an intent to finish, and report how it ended — without throwing on
 * a rejected, expired, or failed intent, or on running out of time.
 *
 * A 404 means "not readable yet", not "does not exist": Custody accepts an
 * intent with 202 and materializes it in the read model a moment later, so a
 * wait that starts right after proposing can race it. It is retried within the
 * same budget, as is a read that timed out; a genuinely absent intent is
 * reported as never readable. The last read lands on the deadline, so the
 * whole budget is used.
 *
 * @param options - How to read the intent, its id, the budget, and an
 *   optional per-read callback.
 * @returns How the intent ended, or where it stood when the budget ran out.
 * @throws Whatever reading the intent throws, other than a 404.
 */
export async function waitForIntentOutcome(
  options: WaitForIntentOptions,
): Promise<IntentOutcome> {
  const { intentId, timeoutMs } = options
  const deadline = Date.now() + timeoutMs
  let last: TrustedIntent | undefined
  for (let attempt = 0; ; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for a terminal state.
    const read = await readIfVisible(options.readIntent)
    if (read !== undefined) {
      last = read
      options.onStatusCheck?.(read.data.state.status, attempt + 1)
      const outcome = terminalOutcome(intentId, read)
      if (outcome !== undefined) {
        return outcome
      }
    }
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      const status = last?.data.state.status
      return {
        intentId,
        status,
        isTerminal: false,
        isSuccess: false,
        reason: describeUnfinished(intentId, status, timeoutMs),
        intent: last,
      }
    }
    // Never sleep past the deadline, so the last read lands on it — the whole
    // budget is used, and the reported wait is the real one.
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for a terminal state.
    await sleep(Math.min(pollDelayMs(attempt, POLL_SCHEDULE), remaining))
  }
}

/** Inputs for {@link pollIntentUntilExecuted}. */
export interface PollIntentOptions {
  /** The authenticated Custody client. */
  readonly client: CustodyHttpClient
  /** The Custody domain the intent belongs to. */
  readonly domainId: string
  /** The intent id to poll (the client-generated id from the envelope). */
  readonly intentId: string
  /** How long to poll before giving up. */
  readonly timeoutMs: number
}

/**
 * Poll a submitted intent until it reaches `Executed`, or throw once it hits a
 * terminal failure or the timeout elapses — {@link waitForIntentOutcome}, with
 * the unsuccessful outcomes thrown. Shared by the native and raw-signing
 * paths, both of which submit one intent and wait on it the same way.
 *
 * {@link IntentPendingError} on timeout is *not* a failure: the intent keeps
 * living custodian-side, and `client.intent.await` resumes it by id.
 *
 * @param options - The client, domain, intent id, and timeout to poll with.
 * @returns The executed intent entity.
 * @throws {@link IntentValidationError} if the intent reaches `Rejected`,
 * `Expired`, or `Failed`.
 * @throws {@link IntentPendingError} if `timeoutMs` elapses with the intent
 * still non-terminal.
 */
export async function pollIntentUntilExecuted(
  options: PollIntentOptions,
): Promise<IntentEntity> {
  const { client, domainId, intentId, timeoutMs } = options
  const outcome = await waitForIntentOutcome({
    readIntent: async () =>
      client.get<TrustedIntent>(`/v1/domains/${domainId}/intents/${intentId}`),
    intentId,
    timeoutMs,
  })
  if (outcome.isSuccess && outcome.intent !== undefined) {
    return outcome.intent.data
  }
  if (outcome.isTerminal) {
    throw new IntentValidationError(outcome.reason)
  }
  throw new IntentPendingError(
    intentId,
    'ripple-custody',
    outcome.status ?? NOT_YET_VISIBLE,
  )
}
