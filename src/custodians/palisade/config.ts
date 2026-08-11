import type { PalisadeScope } from '../../generated/palisade-routes.js'

import type { PalisadeHttpPort } from './transport/http-port.js'

/** The primary wallet's Palisade coordinates. */
export interface PalisadeWalletRef {
  readonly vaultId: string
  readonly walletId: string
}

/** OAuth2 client-credentials for a single Palisade API credential. */
export interface PalisadeClientCredentials {
  /** OAuth2 client-credentials id. */
  readonly clientId: string
  /** OAuth2 client-credentials secret (held in memory only). */
  readonly clientSecret: string
}

/**
 * The two Palisade API credentials the connector requires. Palisade scopes one
 * permission set per credential, so a full setup needs both: a **wallets**
 * credential (wallet-read) for account discovery, and a **transactions**
 * credential for signing and submitting.
 */
export interface PalisadeCredentials {
  /** Wallet-read credential — authorizes discovery (`GET /v2/wallets`). */
  readonly wallets: PalisadeClientCredentials
  /** Transactions credential — authorizes signing and submission. */
  readonly transactions: PalisadeClientCredentials
  /**
   * Optional per-scope credentials for the `palisade.api` surface (tag-based
   * routing, option b). Each key is a Palisade permission scope (an operation's
   * OpenAPI tag, e.g. `Policies` or `Webhooks`); operations in that scope route
   * to its credential instead of falling back to the wallets/transactions pair.
   */
  readonly scoped?: Partial<Record<PalisadeScope, PalisadeClientCredentials>>
}

/** Configuration for {@link PalisadeCustody.create}. */
export interface PalisadeCustodyConfig {
  /** Palisade API base URL (must be HTTPS). */
  readonly baseUrl: string
  /** The wallet-read and transactions API credentials. */
  readonly credentials: PalisadeCredentials
  /** The wallet used when an operation is called without an explicit account. */
  readonly primary: PalisadeWalletRef
  /**
   * Enable the raw-signing fallback for transactors and fields Palisade cannot map
   * natively.
   *
   * **Security note.** On the raw path the custodian signs an opaque payload
   * rather than a structured operation, so its transaction-level controls —
   * transfer policies, allow-lists, and approval rules keyed to operation
   * semantics — cannot inspect what is being signed. Ripple Custody types that
   * payload `Unsafe` for exactly this reason. xrpl.js protocol validation still
   * runs on every path, so malformed transactions are still rejected; what is
   * lost is the custodian's ability to reason about the transaction's intent.
   *
   * Leave this off unless a specific transactor requires it, and prefer routing
   * those operations through a signer that models them natively.
   *
   * @defaultValue `false`
   */
  readonly allowRawSigning?: boolean
  /** How long to wait for a native submission to reach a terminal status. */
  readonly defaultTimeoutMs?: number
  /** Injectable transport (defaults to the production fetch port). */
  readonly http?: PalisadeHttpPort
  /** Injectable clock for the auth service (defaults to `Date.now`). */
  readonly now?: () => number
}
