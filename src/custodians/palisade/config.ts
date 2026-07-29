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
}

/** Configuration for {@link PalisadeCustody.create}. */
export interface PalisadeCustodyConfig {
  /** Palisade API base URL (must be HTTPS). */
  readonly baseUrl: string
  /** The wallet-read and transactions API credentials. */
  readonly credentials: PalisadeCredentials
  /** The wallet used when an operation is called without an explicit account. */
  readonly primary: PalisadeWalletRef
  /** Allow the raw fallback for transactors/fields Palisade can't map. */
  readonly allowRawSigning?: boolean
  /** How long to wait for a native submission to reach a terminal status. */
  readonly defaultTimeoutMs?: number
  /** Injectable transport (defaults to the production fetch port). */
  readonly http?: PalisadeHttpPort
  /** Injectable clock for the auth service (defaults to `Date.now`). */
  readonly now?: () => number
}
