import type { AccountSelector, FeeIntent } from '../domain/index.js'

/**
 * The locally-generated credentials returned by `Account.create`. Nothing is
 * written to the ledger; `seed` is the only way to control the account and must
 * be stored securely.
 */
export interface AccountCredentials {
  /** The classic r-address. */
  readonly address: string
  /** The public key (hex). */
  readonly publicKey: string
  /** The private key (hex) — sensitive. */
  readonly privateKey: string
  /** The account seed (secret) — sensitive. */
  readonly seed: string
}

/** Parameters for `Account.fund` (testnet/devnet faucet funding). */
export interface AccountFundParams {
  /** The r-address to fund (typically from `Account.create`). */
  readonly destination: string
}

/** Parameters for `Account.activate` (operator-funded activation). */
export interface AccountActivateParams {
  /** The r-address to activate (typically from `Account.create`). */
  readonly destination: string
  /** XRP to send; defaults to the network's base reserve. */
  readonly amount?: string
}

/** Per-call options shared by the account verbs. */
export interface AccountWriteOptions {
  /** Source account; defaults to the primary signer's primary account. */
  readonly from?: AccountSelector

  /** Fee override. */
  readonly fee?: FeeIntent

  /**
   * A prior submission's `idempotencyKey` (from its result), to retry to the
   * same intent instead of creating a duplicate (§8). Auto-generated when omitted.
   */
  readonly idempotencyKey?: string
}

/**
 * Parameters for `Account.set`. Each flag is a named boolean (`true` enables,
 * `false` disables); combine with the non-flag fields freely. At least one
 * parameter must be provided.
 *
 * A single `AccountSet` can enable at most one flag and disable at most one, so
 * toggling more than one flag in the same direction is rejected — call
 * `set()` once per such change.
 */
export interface AccountSetParams {
  // Irreversible flags.
  /** Permanently give up the ability to freeze trust lines. */
  readonly noFreeze?: boolean
  /** Permanently allow this issuer to claw back issued tokens. */
  readonly clawbackEnabled?: boolean
  /** Permanently allow trust-line locking. */
  readonly trustLineLocking?: boolean
  /** Permanently disable the master key pair. */
  readonly disableMaster?: boolean

  // Operational flags.
  /** Require holders to be authorized before they can hold issued tokens. */
  readonly requireAuth?: boolean
  /** Require a destination tag on incoming payments. */
  readonly requireDest?: boolean
  /** Enable rippling on trust lines by default. */
  readonly defaultRipple?: boolean
  /** Freeze all trust lines issued by this account. */
  readonly globalFreeze?: boolean
  /** Disallow incoming XRP payments (advisory). */
  readonly disallowXRP?: boolean

  // Non-flag settings.
  /** Transfer fee for issued currencies, as a percentage (0.5 = 0.5%, 0–100). */
  readonly transferRate?: number
  /** Tick size for offers (3–15, or 0 to disable). */
  readonly tickSize?: number
  /** The account domain (plain string; hex-encoded on the ledger). */
  readonly domain?: string
}

/** Parameters for `Account.setRegularKey`. */
export interface SetRegularKeyParams {
  /** The regular key r-address to set; omit to remove the current key. */
  readonly regularKey?: string
}

/** Parameters for `Account.depositPreauth`. */
export interface DepositPreauthParams {
  /** An r-address to preauthorize for deposits. */
  readonly authorize?: string
  /** An r-address to remove preauthorization from. */
  readonly unauthorize?: string
}
