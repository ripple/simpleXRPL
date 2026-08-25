import type {
  Custodian,
  SubmissionHandle,
  SubmissionResult,
} from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

import { fetchIntent, pollIntentUntilExecuted } from './intent-polling.js'

type IntentEntity = components['schemas']['Core_IntentEntity']

/** Inputs for {@link createCustodyIntentHandle}. */
export interface CustodyIntentHandleOptions {
  /** The authenticated Custody client. */
  readonly client: CustodyHttpClient
  /** The Custody domain the intent belongs to. */
  readonly domainId: string
  /** The custodian that produced (or is resuming) the intent. */
  readonly custodian: Custodian
  /** The client-generated intent id to observe. */
  readonly intentId: string
  /** The wait timeout applied when `wait()` is called without an override. */
  readonly defaultTimeoutMs: number
}

/**
 * Wrap a Custody intent entity as a {@link SubmissionResult} snapshot. The raw
 * entity is exposed verbatim as `response` so the caller can read
 * `state.status`; the on-ledger `txHash` extraction from an executed intent is
 * a later refinement.
 *
 * @param intentId - The intent id.
 * @param entity - The current intent entity.
 * @returns The custody-sourced submission result.
 */
function toResult(intentId: string, entity: IntentEntity): SubmissionResult {
  return {
    source: 'custody',
    response: entity,
    intent: undefined,
    intentId,
  }
}

/**
 * Build a {@link SubmissionHandle} over a governance intent: a
 * non-blocking `poll()` snapshot and a bounded, blocking `wait()`. Shared by
 * `RippleCustody.submitAsync` (a freshly-posted intent) and the client's
 * intent inspector (an intent resumed by id).
 *
 * `cancel` is intentionally omitted for now — posting a Custody cancellation
 * intent is out of this iteration's scope.
 *
 * @param options - The client, domain, custodian, intent id, and wait timeout.
 * @returns A handle to poll or wait on the intent's outcome.
 */
export function createCustodyIntentHandle(
  options: CustodyIntentHandleOptions,
): SubmissionHandle {
  const { client, domainId, custodian, intentId, defaultTimeoutMs } = options
  return {
    kind: custodian.kind,
    id: intentId,
    custodian,
    poll: async (): Promise<SubmissionResult> =>
      toResult(intentId, await fetchIntent(client, domainId, intentId)),
    wait: async (timeoutMs?: number): Promise<SubmissionResult> =>
      toResult(
        intentId,
        await pollIntentUntilExecuted({
          client,
          domainId,
          intentId,
          timeoutMs: timeoutMs ?? defaultTimeoutMs,
        }),
      ),
  }
}
