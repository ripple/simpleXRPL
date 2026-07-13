import type { Transaction } from 'xrpl'

import type {
  Account,
  SubmissionContext,
  SubmissionResult,
} from '../domain/index.js'
import { MultiStepFailureError, SimpleXRPLError } from '../errors.js'

/**
 * One step of a multi-step verb: a built transaction paired with the account
 * that signs it (TDD §5.1 — Build produces an ordered list of `(Transaction,
 * Account)` pairs; each pair is dispatched independently).
 */
export interface MultiStepPipelineStep {
  /** The transaction to submit for this step. */
  readonly tx: Transaction
  /** The account that signs and submits this step. */
  readonly account: Account
  /** Optional per-step submission context (fee, dry-run, etc). */
  readonly ctx?: Omit<SubmissionContext, 'account'>
}

/**
 * Wrap a non-`SimpleXRPLError` so `MultiStepFailureError.failed.error` stays typed.
 *
 * @param error - The error thrown by a step's `submitAndWait`.
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
 * next (TDD §8, §9.4). Each step dispatches through its account's own
 * custodian (`account.signer.submitAndWait`) — the real, per-custodian
 * dispatch rule — so this orchestrator has no custodian-specific logic of its
 * own and needs no changes once the single-step pipeline (Resolve/Dispatch)
 * lands.
 *
 * There is no rollback: if a step fails, every prior step has already
 * committed on-ledger/on-custodian. The caller reconciles manually, typically
 * by re-running just the failed step via its matching single-step verb.
 *
 * @param steps - The ordered `(Transaction, Account)` pairs to run.
 * @returns The results of every step, in order.
 * @throws {@link MultiStepFailureError} if any step fails, carrying the
 * already-committed results and the failed step's index and error.
 */
export async function runMultiStep(
  steps: readonly MultiStepPipelineStep[],
): Promise<SubmissionResult[]> {
  const committed: SubmissionResult[] = []
  for (const [index, step] of steps.entries()) {
    let result: SubmissionResult
    try {
      // eslint-disable-next-line no-await-in-loop -- Steps commit sequentially by design (TDD §8, §9.4); no rollback exists.
      result = await step.account.signer.submitAndWait(step.tx, {
        account: step.account,
        ...step.ctx,
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
