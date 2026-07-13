import type { Transaction, TxResponse } from 'xrpl'

import type { SignerCapabilities } from './capabilities.js'

/**
 * The signing backend a custodian adapts.
 */
export type CustodianKind = 'local' | 'ripple-custody' | 'palisade-custody'

/**
 * A custodian's opaque native identifier for an account: a string for
 * account-id custodians, a vault/wallet pair for vault-based custodians, and
 * absent for local wallets. Read only by the owning custodian.
 */
export type CustodianRef =
  | string
  | { readonly vaultId: string; readonly walletId: string }

/**
 * A minimal reference to an account: its r-address plus the owning custodian's
 * native identifier, if any.
 */
export interface AccountRef {
  /** The XRPL r-address — the canonical key the core and verticals use. */
  readonly address: string

  /** The owning custodian's native id, opaque to everything but that custodian. */
  readonly custodianRef?: CustodianRef
}

/**
 * A discovered account, keyed by r-address, with a back-reference to the
 * custodian that owns and signs for it.
 */
export interface Account extends AccountRef {
  /** Custodian-side alias, when the backend exposes one. */
  readonly alias?: string

  /** The custodian that discovered and signs for this account. */
  readonly signer: Custodian

  /** Optional, advisory-only metadata. */
  readonly metadata?: {
    readonly kind?: CustodianKind
    readonly tags?: readonly string[]
  }
}

/**
 * Caller-facing way to choose the source account for a verb: a bare address, an
 * explicit address, or a signer (optionally narrowed to one of its accounts).
 */
export type AccountSelector =
  | string
  | { readonly address: string }
  | { readonly signer: Custodian; readonly account?: string }

/**
 * A signed transaction ready to submit to rippled.
 */
export interface SignedEnvelope {
  /** The signed transaction blob (hex). */
  readonly txBlob: string

  /** The transaction hash, when the backend returns it. */
  readonly hash?: string
}

/**
 * A normalized, optional fee intent. The public surface never takes raw drops;
 * each path translates this to its backend's fee model.
 */
export interface FeeIntent {
  /** Priority tier; backends that cannot honor it auto-price and warn. */
  readonly priority?: 'low' | 'medium' | 'high'

  /** The maximum fee cap, in drops — the common contract across all paths. */
  readonly maxFeeDrops?: string
}

/**
 * Per-submission context threaded through the pipeline to the custodian.
 */
export interface SubmissionContext {
  /** The resolved source account the transaction acts on. */
  readonly account: Account

  /** Optional fee override; falls back to the custodian's configured default. */
  readonly fee?: FeeIntent

  /** Pre-flight the write through the backend's dry-run, where supported. */
  readonly dryRun?: boolean

  /** Return a handle instead of blocking until the transaction is terminal. */
  readonly async?: boolean

  /** Stable, client-generated id that makes a retry resolve to the same intent. */
  readonly idempotencyKey?: string

  /** Human-readable approval metadata stamped on custody intents. */
  readonly customProperties?: Record<string, unknown>

  /** How long to wait before handing control back to the caller. */
  readonly timeoutMs?: number
}

/**
 * Custodian-native transaction result, refined to the generated wire schema in
 * the Custody adapter work; opaque to the core today.
 */
export type CustodyTransactionResult = unknown

/**
 * Palisade-native transaction result, refined to the generated wire schema in
 * the Palisade adapter work; opaque to the core today.
 */
export type PalisadeTransactionResult = unknown

/**
 * Fields shared by every {@link SubmissionResult} variant.
 */
export interface SubmissionResultFields<T> {
  /** Vertical-specific output (e.g. a minted token id). */
  readonly intent: T

  /** Custodian intent id, when the path produced one. */
  readonly intentId?: string

  /** XRPL transaction hash once the transaction is on-ledger. */
  readonly txHash?: string
}

/**
 * The discriminated-union result every write resolves to, tagged by `source`
 * with the backend-specific response preserved verbatim.
 */
export type SubmissionResult<T = unknown> =
  | (SubmissionResultFields<T> & {
      readonly source: 'rippled'
      readonly response: TxResponse
    })
  | (SubmissionResultFields<T> & {
      readonly source: 'custody'
      readonly response: CustodyTransactionResult
    })
  | (SubmissionResultFields<T> & {
      readonly source: 'palisade'
      readonly response: PalisadeTransactionResult
    })

/**
 * Handle returned by an async submission, used to poll or wait for a terminal
 * state without holding the original request open.
 */
export interface SubmissionHandle {
  /** The custodian kind that owns the underlying intent or transaction. */
  readonly kind: CustodianKind

  /** Custodian-native id (intent id), or the XRPL transaction hash for local. */
  readonly id: string

  /** The custodian that produced this handle. */
  readonly custodian: Custodian

  /** A non-blocking snapshot of the current state. */
  readonly poll: () => Promise<SubmissionResult>

  /** Block until terminal state or the timeout (defaults to the custodian's). */
  readonly wait: (timeoutMs?: number) => Promise<SubmissionResult>

  /** Cancel the pending intent where the backend supports it. */
  readonly cancel?: () => Promise<void>
}

/**
 * A signing backend. Each implementation (local, Ripple Custody, Palisade)
 * adapts the canonical xrpl.js transaction to one backend's API and submission
 * flow, and is the unit of configuration on a client.
 */
export interface Custodian {
  /** Which backend this custodian adapts. */
  readonly kind: CustodianKind

  /** The custodian's primary account; it owns this account. */
  readonly primary: AccountRef

  /** The full account list, discovered at construction. */
  readonly listAccounts: () => Promise<Account[]>

  /** What this custodian can sign, consulted at dispatch time. */
  readonly capabilities: () => SignerCapabilities

  /** Produce a signed envelope for a transaction (raw-signing paths). */
  readonly sign: (
    tx: Transaction,
    ctx: SubmissionContext,
  ) => Promise<SignedEnvelope>

  /** Submit and block until the transaction reaches a terminal state. */
  readonly submitAndWait: <T = unknown>(
    tx: Transaction,
    ctx: SubmissionContext,
  ) => Promise<SubmissionResult<T>>

  /** Submit and return a handle once the backend has accepted the intent. */
  readonly submitAsync: (
    tx: Transaction,
    ctx: SubmissionContext,
  ) => Promise<SubmissionHandle>
}
