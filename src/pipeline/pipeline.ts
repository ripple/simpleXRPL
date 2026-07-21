import { validate } from 'xrpl'
import type { Transaction } from 'xrpl'

import type {
  Account,
  FeeIntent,
  SubmissionContext,
  SubmissionResult,
} from '../domain/index.js'
import { IntentValidationError } from '../errors.js'
import { uuidV7 } from '../ids/index.js'

import { dispatch, isNativePath } from './dispatch.js'
import type { SubmissionHost } from './host.js'

/**
 * A built transaction plus the resolved account and per-call options, handed to
 * {@link submitTransaction}.
 */
export interface SubmitRequest {
  /** The transaction built by the vertical. */
  readonly transaction: Transaction

  /** The resolved source account. */
  readonly account: Account

  /** Fee override; falls back to the custodian's default. */
  readonly fee?: FeeIntent

  /** Pre-flight the write through the backend's dry-run, where supported. */
  readonly dryRun?: boolean

  /** Free-form approval metadata for custodian intents. */
  readonly customProperties?: Record<string, unknown>

  /** Stable, client-generated id making a retry idempotent. */
  readonly idempotencyKey?: string

  /** How long to wait before handing control back. */
  readonly timeoutMs?: number
}

/**
 * Run a single built transaction through Validate → Dispatch → Resolve →
 * Sign+submit → Wait. Returns the custodian's transport result; callers attach
 * the vertical `intent` output via {@link withIntent}.
 *
 * A stable idempotency id is generated here (a time-ordered UUIDv7) unless the
 * caller supplied one, so it is fixed before the intent is created, surfaced on
 * the result, and reused verbatim on a retry (§8) — resolving to the same
 * intent instead of a duplicate.
 *
 * @param host - The client subset the pipeline runs against.
 * @param request - The transaction, resolved account, and per-call options.
 * @returns The submission result, carrying the `idempotencyKey` used.
 * @throws {@link IntentValidationError} if protocol validation fails.
 * @throws {@link SignerCapabilityError} if the custodian cannot sign the transactor.
 */
export async function submitTransaction(
  host: SubmissionHost,
  request: SubmitRequest,
): Promise<SubmissionResult> {
  const { transaction, account } = request
  validateProtocol(transaction)
  const path = dispatch(account, transaction.TransactionType)

  // Local and raw paths sign an SDK-resolved transaction; native custody paths
  // let the custodian own network fields.
  const resolved = isNativePath(path)
    ? transaction
    : await host.ledger.autofill(transaction)

  const idempotencyKey = request.idempotencyKey ?? uuidV7()
  const context: SubmissionContext = {
    account,
    ledger: host.ledger,
    fee: request.fee,
    dryRun: request.dryRun,
    customProperties: request.customProperties,
    idempotencyKey,
    timeoutMs: request.timeoutMs,
  }
  const result = await account.signer.submitAndWait(resolved, context)
  return { ...result, idempotencyKey }
}

/**
 * Run the xrpl protocol validator, re-wrapping its error so callers see one
 * error class.
 *
 * @param transaction - The transaction to validate.
 * @throws {@link IntentValidationError} if validation fails.
 */
function validateProtocol(transaction: Transaction): void {
  try {
    validate(transaction)
  } catch (error) {
    throw new IntentValidationError(
      error instanceof Error ? error.message : 'Transaction failed validation',
      { cause: error },
    )
  }
}
