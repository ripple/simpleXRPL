import type { Transaction } from 'xrpl'

import type { FeeIntent } from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'
import { uuidV7 } from '../../../ids/index.js'
import type { IntentSigner } from '../auth/intent-signer.js'

import { buildCustomProperties } from './custom-properties.js'
import { toFeeStrategy } from './fee-strategy.js'
import { toMemos } from './memos.js'
import { buildProposeEnvelope } from './propose-envelope.js'
import { txToOperation } from './xrpl-operations.js'

type ProposeIntentBody = components['schemas']['Core_ProposeIntentBody']
type TransactionOrderParametersXrpl =
  components['schemas']['Core_TransactionOrderParameters_XRPL']

/** Inputs for building one signed `v0_CreateTransactionOrder` intent envelope. */
export interface BuildEnvelopeOptions {
  /** The Custody domain this intent targets. */
  readonly domainId: string
  /** The intent-author's own Custody user id (resolved once via `GET /v1/me`). */
  readonly authorUserId: string
  /** The Custody account UUID that owns and signs this transaction. */
  readonly accountId: string
  /**
   * The XRPL ledger id backing `accountId`. Required for multi-ledger Vault
   * accounts (no ledger default of their own); omit for legacy single-ledger
   * accounts, where Custody infers it from the account itself.
   */
  readonly ledgerId?: string
  /** The transaction to submit. */
  readonly transaction: Transaction
  /** Fee override; falls back to `Priority: Low` with no cap. */
  readonly fee?: FeeIntent
  /**
   * Stable id making a retry resolve to the same intent. Falls back to a fresh
   * time-ordered {@link uuidV7} when omitted, though in practice the pipeline
   * always supplies one so it is fixed before the intent is created.
   */
  readonly idempotencyKey?: string
}

/**
 * Build and sign a `v0_CreateTransactionOrder` intent envelope: map the
 * transaction to Custody's native operation, attach the fee strategy and a
 * human-readable `customProperties` summary, then sign the canonicalized
 * request with the intent-author key.
 *
 * @param intentSigner - Signs the canonicalized request.
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
    memos: toMemos(options.transaction),
    sourceTag: options.transaction.SourceTag,
    operation,
    type: 'XRPL',
  }

  // The payload carries its own id, which must match the envelope id — the
  // caller's idempotency key resolves a retry to the same intent. Resolve it
  // once here (falling back to a fresh id) so both stay in sync, since
  // `buildProposeEnvelope` would otherwise generate the envelope id on its own.
  const intentId = options.idempotencyKey ?? uuidV7()

  return buildProposeEnvelope(intentSigner, {
    domainId: options.domainId,
    authorUserId: options.authorUserId,
    payload: {
      id: intentId,
      accountId: options.accountId,
      ledgerId: options.ledgerId,
      parameters,
      customProperties,
      type: 'v0_CreateTransactionOrder',
    },
    overrides: { id: intentId, customProperties },
  })
}
