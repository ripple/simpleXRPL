import { IntentPendingError, IntentValidationError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type TrustedIntent = components['schemas']['Core_TrustedIntent']
type IntentEntity = components['schemas']['Core_IntentEntity']
type IntentStatus = components['schemas']['Core_IntentStatus']

const POLL_INTERVAL_MS = 1000

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
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for a terminal state.
    const trusted = await client.get<TrustedIntent>(
      `/v1/domains/${domainId}/intents/${intentId}`,
    )
    const { status } = trusted.data.state
    if (status === 'Executed') {
      return trusted.data
    }
    if (TERMINAL_FAILURE_STATUSES.has(status)) {
      throw new IntentValidationError(
        describeFailure(intentId, trusted.data.state),
      )
    }
    if (Date.now() >= deadline) {
      throw new IntentPendingError(intentId, 'ripple-custody', status)
    }
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for a terminal state.
    await sleep(POLL_INTERVAL_MS)
  }
}
