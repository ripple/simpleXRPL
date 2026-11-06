import type { FeeIntent } from '../../domain/index.js'
import type { components } from '../../generated/custody.js'

import type { ProposeEnvelopeOverrides } from './mapping/propose-envelope.js'
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

/**
 * A native XRPL transaction order, for
 * {@link CustodyApi.proposeTransactionOrder}: Custody's own operation (e.g. a
 * `Payment` to an `Endpoint`, an `MPTokenIssuanceCreate`, an
 * `MPTokenAuthorize`), sent from an XRPL address.
 */
export interface CustodyTransactionOrder {
  /** The sending account's XRPL address. Its Custody account is looked up. */
  readonly account: string
  /** The operation, exactly as Custody's API defines it. */
  readonly operation: components['schemas']['Core_XrplOperation']
  /**
   * The ledger the sending account is on, e.g. `xrpl`. Needed when the account
   * holds its address on several ledgers.
   */
  readonly ledgerId?: string
  /** The fee strategy; defaults to `Priority: Low`. */
  readonly feeStrategy?: components['schemas']['Core_XrplFeeStrategy']
  /** The most the fee may be, in drops. */
  readonly maximumFee?: string
  /** Memos; none by default. */
  readonly memos?: ReadonlyArray<components['schemas']['Core_XrplMemo']>
  /** The XRPL `SourceTag`. */
  readonly sourceTag?: number
  /** The order's own custom properties (envelope ones go in the options). */
  readonly customProperties?: components['schemas']['Core_StringsMap']
}

/** Options for {@link CustodyApi.proposeTransactionOrder}. */
export type CustodyTransactionOrderOptions = ProposeEnvelopeOverrides & {
  /**
   * Dry-run the order first. If Custody says it would fail, throw a
   * `DryRunFailedError` (carrying the verdict) and propose nothing.
   */
  readonly dryRun?: boolean
}
