import type { AccountSelector, FeeIntent } from '../domain/index.js'

/** Per-call options shared by the account verbs. */
export interface AccountWriteOptions {
  /** Source account; defaults to the primary signer's primary account. */
  readonly from?: AccountSelector

  /** Fee override. */
  readonly fee?: FeeIntent
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
