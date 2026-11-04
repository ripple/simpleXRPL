import type { FeeIntent } from '../../domain/index.js'
import type { components } from '../../generated/custody.js'

import type { IntentOutcome } from './submission/intent-polling.js'

/*
 * Public types for waiting on intents and dry-running them through
 * `CustodyApi`.
 */

/**
 * How an intent wait ended — reported, never thrown. Read `isSuccess` and
 * `isTerminal`; `reason` says the same in one sentence whenever the intent
 * didn't execute (including when the wait ran out of time with it still
 * `Open`, most likely waiting for an approval).
 */
export type CustodyIntentOutcome = IntentOutcome

/** Options for {@link CustodyApi.waitForIntent}. */
export interface CustodyWaitOptions {
  /** The domain the intent is in; defaults to the custodian's domain. */
  readonly domainId?: string
  /**
   * How long to wait before reporting the intent as still in progress.
   * Defaults to the custodian's `defaultTimeoutMs` (60 s unless configured).
   */
  readonly timeoutMs?: number
  /** Called with each status read, and the attempt number (from 1). */
  readonly onStatusCheck?: (
    status: components['schemas']['Core_IntentStatus'],
    attempt: number,
  ) => void
}

/** What {@link CustodyApi.proposeAndWait} returns. */
export type CustodyProposeAndWaitResult = CustodyIntentOutcome & {
  /** Custody's id for the propose request. */
  readonly requestId: string
}

/** Custody's dry-run response for one intent type. */
export type CustodyDryRunResponse<
  Type extends components['schemas']['Core_ProposeUserIntentPayload']['type'],
> = Extract<
  components['schemas']['Core_IntentDryRunResponse'],
  { readonly type: Type }
>

/**
 * Custody's dry-run of a transaction order: the verdict (`success`, `errors`),
 * the transaction-level `result`, and the fee `estimate`.
 */
export type CustodyTransactionDryRun =
  CustodyDryRunResponse<'v0_CreateTransactionOrder'>

/** Options for {@link CustodyApi.dryRunTransaction}. */
export interface CustodyDryRunTransactionOptions {
  /**
   * The ledger the sending account is on, e.g. `xrpl`. Needed when the account
   * holds its address on several ledgers.
   */
  readonly ledgerId?: string
  /** Fee override; defaults to `Priority: Low`, as a submission would. */
  readonly fee?: FeeIntent
}
