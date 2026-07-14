import { randomUUID } from 'node:crypto'

import type { Transaction } from 'xrpl'

import type { FeeIntent } from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'
import type { IntentSigner } from '../auth/intent-signer.js'

import { buildCustomProperties } from './custom-properties.js'
import { toFeeStrategy } from './fee-strategy.js'
import { txToOperation } from './xrpl-operations.js'

type ProposeIntentBody = components['schemas']['Core_ProposeIntentBody']
type TransactionOrderParametersXrpl =
  components['schemas']['Core_TransactionOrderParameters_XRPL']

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
/**
 * Default intent lifetime (TDD §10.1: "~1 day, overridable per call / at
 * init"). No override knob yet — that lands with the async/governance
 * refinements in DGE-7466.
 */
const DEFAULT_EXPIRY_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

/** Inputs for building one signed `v0_CreateTransactionOrder` intent envelope. */
export interface BuildEnvelopeOptions {
  /** The Custody domain this intent targets. */
  readonly domainId: string
  /** The intent-author's own Custody user id (resolved once via `GET /v1/me`). */
  readonly authorUserId: string
  /** The Custody account UUID that owns and signs this transaction. */
  readonly accountId: string
  /** The transaction to submit. */
  readonly transaction: Transaction
  /** Fee override; falls back to `Priority: Low` with no cap. */
  readonly fee?: FeeIntent
  /**
   * Stable id making a retry resolve to the same intent (TDD §8). Generates a
   * fresh id if omitted — a v4 placeholder; DGE-7472 replaces this with a
   * real time-ordered UUIDv7.
   */
  readonly idempotencyKey?: string
}

/**
 * Build and sign a `v0_CreateTransactionOrder` intent envelope (TDD §7.2,
 * §7.5): map the transaction to Custody's native operation, attach the fee
 * strategy and a human-readable `customProperties` summary, then sign the
 * canonicalized request with the intent-author key.
 *
 * @param intentSigner - Signs the canonicalized request (DGE-7462).
 * @param options - The domain, author, account, transaction, and fee.
 * @returns The signed `{ request, signature }` body ready to POST to
 * `/v1/intents`.
 * @throws {@link SignerCapabilityError} if the transactor (or one of its
 * fields) has no native Custody representation.
 */
export function buildProposeIntentBody(
  intentSigner: IntentSigner,
  options: BuildEnvelopeOptions,
): ProposeIntentBody {
  const operation = txToOperation(options.transaction)
  const { feeStrategy, maximumFee } = toFeeStrategy(options.fee)
  const customProperties = buildCustomProperties(options.transaction)

  const parameters: TransactionOrderParametersXrpl = {
    feeStrategy,
    maximumFee,
    memos: [],
    operation,
    type: 'XRPL',
  }

  const intentId = options.idempotencyKey ?? randomUUID()
  const request = {
    author: { id: options.authorUserId, domainId: options.domainId },
    expiryAt: new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString(),
    targetDomainId: options.domainId,
    id: intentId,
    payload: {
      id: intentId,
      accountId: options.accountId,
      parameters,
      customProperties,
      type: 'v0_CreateTransactionOrder' as const,
    },
    customProperties,
    type: 'Propose' as const,
  }

  return intentSigner.signEnvelope({ request })
}
