import type { TxResponse } from 'xrpl'

import { IntentPendingError, XrpldSubmitError } from '../errors.js'
import type { LedgerPort } from '../ports/index.js'

import type { PollSchedule } from './poll-schedule.js'
import { pollDelayMs } from './poll-schedule.js'

/** The one XRPL engine result that means the transaction achieved its intent. */
const TES_SUCCESS = 'tesSUCCESS'

/**
 * Cadence for re-reading a transaction the custodian has already reported
 * on-ledger. Responsive at first, capped low: this only absorbs the brief lag
 * between the custodian's view and the transaction being queryable/validated
 * here — it is not a long governance wait.
 */
const CONFIRM_SCHEDULE: PollSchedule = { initialMs: 1000, maxMs: 5000 }

/** How long to keep re-reading before declaring the result indeterminate. */
const CONFIRM_TIMEOUT_MS = 30_000

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
 * Read the XRPL engine result from a transaction response, if present.
 *
 * A `submitAndWait` / `tx` response carries the result in `meta.TransactionResult`,
 * but `meta` is absent while the transaction is unconfirmed and a bare string
 * when the response is requested in binary form — neither yields a result code.
 *
 * @param response - The transaction response.
 * @returns The engine result code (e.g. `tesSUCCESS`, `tecPATH_DRY`), or
 *   `undefined` when no structured metadata is available.
 */
export function engineResultOf(response: TxResponse): string | undefined {
  const { meta } = response.result
  return meta !== undefined && typeof meta !== 'string'
    ? meta.TransactionResult
    : undefined
}

/** Inputs for {@link assertOnLedgerSuccess}. */
export interface AssertOnLedgerSuccessOptions {
  /** The shared ledger connection to read the transaction back from. */
  readonly ledger: LedgerPort
  /** The XRPL transaction hash the custodian reported on-ledger. */
  readonly txHash: string
  /** The custodian kind, for the pending-error the indeterminate case throws. */
  readonly custodian: 'ripple-custody' | 'palisade-custody'
  /** The intent/transaction id to resume with if the result stays indeterminate. */
  readonly intentId: string
}

/**
 * Assert that an on-ledger transaction achieved its intent — that its XRPL
 * engine result is `tesSUCCESS`.
 *
 * A custodian can report a transaction as on-ledger (it has a hash, it claimed a
 * fee) while the transaction actually failed with a `tec` — included in the
 * ledger but with its intended effect not applied. A hash alone is therefore not
 * success. Custody's wire schema exposes no engine result at all, so this reads
 * the authoritative result straight off the ledger by hash.
 *
 * The check is positive: it confirms the transaction is `validated` and carries
 * a readable result, then gates on that result. It never treats an unreadable
 * or not-yet-found transaction as success.
 *
 * - **tesSUCCESS** — returns.
 * - **Any other engine result** (`tec*`, `tem*`, `tef*`, …) — throws
 *   {@link XrpldSubmitError}. The transaction is on-ledger and terminal, so a
 *   retry is a genuinely new attempt and needs a fresh idempotency key.
 * - **Not yet queryable / validated** — re-reads on a short schedule to absorb
 *   propagation lag, then throws {@link IntentPendingError} (indeterminate): the
 *   transaction may still confirm, so a retry must re-drive the *same* key.
 *
 * @param options - The ledger, the transaction hash, and the resume context.
 * @throws {@link XrpldSubmitError} on a non-`tesSUCCESS` engine result.
 * @throws {@link IntentPendingError} if the result stays indeterminate.
 */
export async function assertOnLedgerSuccess(
  options: AssertOnLedgerSuccessOptions,
): Promise<void> {
  const { ledger, txHash, custodian, intentId } = options
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS

  for (let attempt = 0; ; attempt += 1) {
    let response: TxResponse | undefined
    try {
      // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for the validated result.
      response = await ledger.request<TxResponse>({
        command: 'tx',
        transaction: txHash,
      })
    } catch {
      // A `txnNotFound` (or a transient transport error) means the transaction
      // the custodian reported on-ledger is not queryable here yet — not that it
      // failed. Fall through and retry rather than misreport it.
      response = undefined
    }

    if (response?.result.validated) {
      const engineResult = engineResultOf(response)
      // Only decide once the result is actually readable; a validated response
      // whose metadata has not materialized yet keeps polling.
      if (engineResult === TES_SUCCESS) {
        return
      }
      if (engineResult !== undefined) {
        throw new XrpldSubmitError(engineResult, response)
      }
    }

    const delay = pollDelayMs(attempt, CONFIRM_SCHEDULE)
    if (Date.now() + delay >= deadline) {
      throw new IntentPendingError(
        intentId,
        custodian,
        'on-ledger transaction not yet confirmed',
      )
    }
    // eslint-disable-next-line no-await-in-loop -- Sequential polling is inherent to waiting for the validated result.
    await sleep(delay)
  }
}
