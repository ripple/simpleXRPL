import type { PalisadeHttpPort } from './transport/http-port.js'

/** The primary wallet's Palisade coordinates. */
export interface PalisadeWalletRef {
  readonly vaultId: string
  readonly walletId: string
  /**
   * The wallet's XRPL r-address. Optional: when provided, {@link
   * PalisadeCustody.create} binds the primary directly and **skips wallet
   * discovery** (the `GET /v2/wallets` listing). Supply it when the API
   * credential is scoped to transactions only and cannot read the wallet list;
   * omit it to have the address resolved by discovery instead.
   */
  readonly xrplAddress?: string
}

/** Configuration for {@link PalisadeCustody.create}. */
export interface PalisadeCustodyConfig {
  /** Palisade API base URL (must be HTTPS). */
  readonly baseUrl: string
  /** OAuth2 client-credentials id. */
  readonly clientId: string
  /** OAuth2 client-credentials secret (held in memory only). */
  readonly clientSecret: string
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
