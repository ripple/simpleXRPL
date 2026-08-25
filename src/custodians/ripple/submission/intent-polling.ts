import {
  CustodyApiError,
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
 * Fetch one intent's current entity, without polling (TDD §10.2): the
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
 * terminal failure or the timeout elapses (TDD §10.1). Shared by the native
 * and raw-signing paths, both of which submit one intent and wait on it the
 * same way.
 *
 * Bounded, blocking wait only — {@link IntentPendingError} on timeout is *not*
 * a failure (TDD §11): the intent keeps living custodian-side. Resuming a
 * timed-out intent from its id (`client.intent.await`) is DGE-7466's async /
 * governance-observation surface, not this polling primitive.
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
  const deadline = Date.now() + timeoutMs
  let lastStatus: IntentStatus | typeof NOT_YET_VISIBLE = NOT_YET_VISIBLE
  for (let attempt = 0; ; attempt += 1) {
    let trusted: TrustedIntent | undefined
    try {
      // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for a terminal state.
      trusted = await client.get<TrustedIntent>(
        `/v1/domains/${domainId}/intents/${intentId}`,
      )
    } catch (error) {
      // A 404 here means "not readable yet", not "does not exist". Custody
      // accepts the intent with 202 and materializes it in the read model a
      // moment later, so polling that starts immediately after submission can
      // race it. Treating that as fatal reported *successful* payments as
      // failures — the intent went on to execute and move funds while the
      // caller saw an error. Keep waiting instead; a genuinely absent intent
      // still surfaces, as IntentPendingError once the deadline passes.
      if (
        !(error instanceof CustodyApiError) ||
        error.status !== HTTP_NOT_FOUND
      ) {
        throw error
      }
    }

    if (trusted !== undefined) {
      const { status } = trusted.data.state
      lastStatus = status
      if (status === 'Executed') {
        return trusted.data
      }
      if (TERMINAL_FAILURE_STATUSES.has(status)) {
        throw new IntentValidationError(
          describeFailure(intentId, trusted.data.state),
        )
      }
    }

    const delay = pollDelayMs(attempt, POLL_SCHEDULE)
    if (Date.now() + delay >= deadline) {
      throw new IntentPendingError(intentId, 'ripple-custody', lastStatus)
    }
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for a terminal state.
    await sleep(delay)
  }
}
