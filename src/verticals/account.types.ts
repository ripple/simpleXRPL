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
  /**
   * XRP to send.
   *
   * @defaultValue The network's base reserve plus a small buffer (so the new
   *   account can afford its own follow-up `defaultRipple` transaction).
   */
  readonly amount?: string
}

/** Per-call options shared by the account operations. */
export interface AccountWriteOptions {
  /** Source account; defaults to the primary signer's primary account. */
  readonly from?: AccountSelector

  /** Fee override. */
  readonly fee?: FeeIntent

  /**
   * A prior submission's `idempotencyKey` (from its result) so a retry resolves
   * to the same submission instead of duplicating it. How completely this
   * de-duplicates is set by the backend — see the note on the result's
   * `idempotencyKey`. Auto-generated when omitted.
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
 *
 * Any field left unset is **left unchanged** on the account — omitting a flag
 * neither enables nor disables it; the SDK applies no defaults here.
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

/** Parameters for {@link AccountVertical.retrieve}. */
export interface AccountRetrieveParams {
  /**
   * The account to read.
   *
   * @defaultValue The primary signer's account.
   */
  readonly account?: string
}

/** A shaped account snapshot (from `account_info`). */
export interface AccountData {
  /** The account's r-address. */
  readonly address: string
  /** The XRP balance (converted from drops). */
  readonly xrpBalance: string
  /** The account sequence number. */
  readonly sequence: number
  /** The number of owned ledger objects (drives the reserve). */
  readonly ownerCount: number
  /** Account flags as booleans, as reported by `account_flags`. */
  readonly flags: Readonly<Record<string, boolean>>
}

/** Result of {@link AccountVertical.retrieve}. */
export interface AccountRetrieveResult {
  /** The point-in-time account snapshot. */
  readonly data: AccountData
}

/** Parameters for {@link AccountVertical.listOffers}. */
export interface AccountListOffersParams {
  /**
   * The account whose offers to list.
   *
   * @defaultValue The primary signer's account.
   */
  readonly account?: string
}
