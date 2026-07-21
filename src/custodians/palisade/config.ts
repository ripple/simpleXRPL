import type { PalisadeHttpPort } from './transport/http-port.js'

/** The primary wallet's Palisade coordinates. */
export interface PalisadeWalletRef {
  readonly vaultId: string
  readonly walletId: string
}

/** Configuration for {@link PalisadeCustody.create}. */
export interface PalisadeCustodyConfig {
  /** Palisade API base URL (must be HTTPS). */
  readonly baseUrl: string
  /** OAuth2 client-credentials id. */
  readonly clientId: string
  /** OAuth2 client-credentials secret (held in memory only). */
  readonly clientSecret: string
  /** The wallet used when a verb is called without an explicit account. */
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
