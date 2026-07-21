import type {
  Custodian,
  IntentObserver,
  SubmissionHandle,
  SubmissionResult,
} from '../domain/index.js'
import { SimpleXRPLError } from '../errors.js'

/**
 * Narrow a custodian to one that can observe governance intents.
 *
 * @param signer - The custodian to test.
 * @returns `true` if the custodian implements {@link IntentObserver}.
 */
function isIntentObserver(
  signer: Custodian,
): signer is Custodian & IntentObserver {
  return 'observeIntent' in signer
}

/**
 * Read-only observation of custodian governance intents the SDK previously
 * created (TDD §10.4): resume polling or waiting on an intent by id after its
 * original submission has already returned (e.g. after a `submitAndWait`
 * timed out with an {@link IntentPendingError}, or a `submitAsync` handle was
 * not retained). The SDK is a proposer/observer only — it never approves,
 * rejects, or configures policy.
 */
export class IntentInspector {
  private readonly observers: ReadonlyArray<Custodian & IntentObserver>

  /**
   * Construct an intent inspector over the client's signers.
   *
   * @param signers - The client's registered custodians; those that can
   * observe governance intents (Ripple Custody) are retained.
   */
  public constructor(signers: readonly Custodian[]) {
    this.observers = signers.filter(isIntentObserver)
  }

  /**
   * A non-blocking snapshot of an intent's current state.
   *
   * @param intentId - The intent id returned at submission.
   * @returns The current submission-result snapshot (read `response.state`).
   * @throws {@link SimpleXRPLError} if no configured custodian can observe intents.
   */
  public async status(intentId: string): Promise<SubmissionResult> {
    return this.handleFor(intentId).poll()
  }

  /**
   * Resume blocking on an intent until it reaches a terminal state.
   *
   * @param intentId - The intent id returned at submission.
   * @param timeoutMs - How long to wait before giving up (custodian default if omitted).
   * @returns The terminal submission result.
   * @throws {@link SimpleXRPLError} if no configured custodian can observe intents.
   * @throws {@link IntentValidationError} if the intent is rejected, expired, or failed.
   * @throws {@link IntentPendingError} if the timeout elapses while still pending.
   */
  public async await(
    intentId: string,
    timeoutMs?: number,
  ): Promise<SubmissionResult> {
    return this.handleFor(intentId).wait(timeoutMs)
  }

  /**
   * Build a handle over an intent by id, via the first custodian that can
   * observe governance intents.
   *
   * @param intentId - The intent id to observe.
   * @returns A handle to poll or wait on the intent.
   * @throws {@link SimpleXRPLError} if no configured custodian can observe intents.
   */
  public handleFor(intentId: string): SubmissionHandle {
    if (this.observers.length === 0) {
      throw new SimpleXRPLError(
        'No configured custodian can observe governance intents; add a RippleCustody signer to use client.intent.',
      )
    }
    return this.observers[0].observeIntent(intentId)
  }
}
