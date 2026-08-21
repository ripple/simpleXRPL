import type { SubmissionResult } from '../domain/index.js'
import { MultiStepFailureError, SimpleXRPLError } from '../errors.js'
import type { SubmissionHost, SubmitRequest } from '../pipeline/index.js'
import { submitTransaction } from '../pipeline/index.js'

/**
 * How long each step of a multi-step operation may take before the custodian
 * poll gives up.
 *
 * Deliberately far longer than the 60-second single-step default. A step of a
 * multi-step operation is not just one transaction — it is a barrier: nothing
 * after it runs until it lands. On a governed custodian a step routinely waits
 * on a human pressing approve, and the steps can belong to *different* accounts
 * (`IOU.issue` sequences issuer → holder → issuer), so an approver may not even
 * know the next step is queued behind theirs. At 60 seconds the common outcome
 * was that step one timed out and the remaining steps were never submitted at
 * all, leaving a half-configured issuer.
 *
 * An hour is a bound, not a promise: `IntentPendingError` still ends the wait,
 * and the intent goes on living custodian-side to be resumed by id.
 */
export const MULTI_STEP_STEP_TIMEOUT_MS = 3_600_000

/**
 * Wrap a non-`SimpleXRPLError` so `MultiStepFailureError.failed.error` stays typed.
 *
 * @param error - The error thrown by a step's pipeline run.
 * @returns `error` unchanged if it is already a `SimpleXRPLError`, else a
 * `SimpleXRPLError` wrapping it as `cause`.
 */
function toSimpleXRPLError(error: unknown): SimpleXRPLError {
  if (error instanceof SimpleXRPLError) {
    return error
  }
  return new SimpleXRPLError('Multi-step pipeline step failed', {
    cause: error,
  })
}

/**
 * Run an ordered sequence of steps, committing each one before starting the
 * next. Each step runs through the single-step pipeline
 * ({@link submitTransaction} — Validate → Dispatch → Resolve → Sign+submit),
 * so multi-step operations get the same protocol validation and dispatch rules as
 * any single-step operation, with no orchestrator-specific custodian logic.
 *
 * There is no rollback: if a step fails, every prior step has already
 * committed on-ledger/on-custodian. The caller reconciles manually, typically
 * by re-running just the failed step via its matching single-step operation.
 *
 * @param host - The client subset the pipeline runs against.
 * @param steps - The ordered submission requests to run.
 * @returns The results of every step, in order.
 * @throws {@link MultiStepFailureError} if any step fails, carrying the
 * already-committed results and the failed step's index and error.
 */
export async function runMultiStep(
  host: SubmissionHost,
  steps: readonly SubmitRequest[],
): Promise<SubmissionResult[]> {
  const committed: SubmissionResult[] = []
  for (const [index, step] of steps.entries()) {
    let result: SubmissionResult
    try {
      // eslint-disable-next-line no-await-in-loop -- Steps commit sequentially by design; no rollback exists.
      result = await submitTransaction(host, {
        ...step,
        // `??`, not an overwrite: an explicit per-step timeout still wins, so a
        // caller (or a future vertical) can opt a single step back out.
        timeoutMs: step.timeoutMs ?? MULTI_STEP_STEP_TIMEOUT_MS,
      })
    } catch (error) {
      throw new MultiStepFailureError(committed, {
        step: index,
        error: toSimpleXRPLError(error),
      })
    }
    committed.push(result)
  }
  return committed
}
