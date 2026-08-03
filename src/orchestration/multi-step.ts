import type { SubmissionResult } from '../domain/index.js'
import { MultiStepFailureError, SimpleXRPLError } from '../errors.js'
import type { SubmissionHost, SubmitRequest } from '../pipeline/index.js'
import { submitTransaction } from '../pipeline/index.js'

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
      result = await submitTransaction(host, step)
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
