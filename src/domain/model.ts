import type { Transaction, TxResponse } from 'xrpl'

import type { LedgerPort } from '../ports/ledger.js'

import type { SignerCapabilities } from './capabilities.js'

/**
 * The signing backend a custodian adapts.
 */
export type CustodianKind =
  'local' | 'ripple-custody' | 'palisade-custody' | 'external'

/**
 * A custodian's opaque native identifier for an account: a string for
 * account-id custodians, a vault/wallet pair for vault-based custodians, and
 * absent for local wallets. Read only by the owning custodian.
 */
export type CustodianRef =
  string | { readonly vaultId: string; readonly walletId: string }

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

  /**
   * The custodian-specific ledger id backing this address, when the backend
   * needs one disambiguated (e.g. Ripple Custody's multi-ledger Vault
   * accounts, which carry no ledger default of their own).
   */
  readonly ledgerId?: string

  /**
   * The XRPL network this account record is scoped to, as the `network_id` a
   * node reports via `server_info` (Mainnet 0, Testnet 1, Devnet 2). The client
   * uses it to pick, among several records for one r-address, the one matching
   * the network it is connected to. `undefined` for network-agnostic holders
   * (a local wallet key works on any network) and for backends that expose no
   * network id.
   */
  readonly networkId?: number

  /**
   * The account's XRPL public key (hex), when the custodian exposes it. Used to
   * populate `SigningPubKey` on transactions signed by a backend that returns
   * only the signature (e.g. Palisade's raw sign-only path).
   */
  readonly publicKey?: string

  /** The custodian that discovered and signs for this account. */
  readonly signer: Custodian

  /** Optional, advisory-only metadata. */
  readonly metadata?: {
    readonly kind?: CustodianKind
    readonly tags?: readonly string[]
  }
}

/**
 * Caller-facing way to choose the source account for an operation: a bare address, an
 * explicit address, or a signer (optionally narrowed to one of its accounts).
 */
export type AccountSelector =
  | string
  | { readonly address: string }
  | { readonly signer: Custodian; readonly account?: string }

/**
 * A signed transaction ready to submit to xrpld.
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

  /** The shared ledger connection the custodian submits through. */
  readonly ledger: LedgerPort

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

  /**
   * The stable, client-generated id (a UUIDv7) this submission carried (§8).
   * Re-submitting with the same id resolves to the same intent rather than
   * creating a duplicate; pass it back as an operation's `idempotencyKey` to retry.
   */
  readonly idempotencyKey?: string
}

/**
 * The discriminated-union result every write resolves to, tagged by `source`
 * with the backend-specific response preserved verbatim.
 */
export type SubmissionResult<T = unknown> =
  | (SubmissionResultFields<T> & {
      readonly source: 'xrpld'
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

  /**
   * The backend tenant this custodian is bound to — a Custody domain id, a
   * Palisade org/client identity, etc. Two signers with the same `kind` and
   * the same `tenantId` point at the same backend tenant, which the client
   * rejects at init (§3.1). `undefined` for backends with no tenant notion
   * (e.g. a local wallet holder), so multiple of those may coexist freely.
   */
  readonly tenantId?: string

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

  /**
   * Submit and block until the transaction reaches a terminal state. The
   * custodian returns the transport result; the vertical attaches the typed
   * `intent` output.
   */
  readonly submitAndWait: (
    tx: Transaction,
    ctx: SubmissionContext,
  ) => Promise<SubmissionResult>

  /** Submit and return a handle once the backend has accepted the intent. */
  readonly submitAsync: (
    tx: Transaction,
    ctx: SubmissionContext,
  ) => Promise<SubmissionHandle>
}

/**
 * A custodian that can resume observation of a governance intent it previously
 * created, addressed by the intent id (§10.4). Only backends with a governed
 * intent lifecycle (Ripple Custody, Palisade) implement this; a local wallet
 * has no intents to observe. The client's intent inspector uses it to poll or
 * await an intent whose original submission has already returned.
 */
export interface IntentObserver {
  /** Which backend owns the intents this observer resumes. */
  readonly kind: CustodianKind

  /**
   * Build a handle over an intent this custodian previously created.
   *
   * @param intentId - The client-generated intent id returned at submission.
   * @returns A handle to poll or wait on the existing intent's outcome.
   */
  readonly observeIntent: (intentId: string) => SubmissionHandle
}

/**
 * The on-chain outcome of a custodian-submitted transaction, available once
 * the ledger has confirmed it. Returned by {@link OnChainObserver.awaitOnChain}
 * and surfaced via `client.intent.awaitOnChain`.
 */
export interface OnChainResult {
  /** The XRPL transaction hash. */
  readonly txHash: string
  /** Present when the transaction created an MPT issuance. */
  readonly mptIssuanceId?: string
}
