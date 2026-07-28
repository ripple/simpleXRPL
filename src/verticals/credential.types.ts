import type { AccountSelector, FeeIntent } from '../domain/index.js'

/** Per-call options shared by the credential operations. */
export interface CredentialWriteOptions {
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

/** Parameters for `Credential.issue` (issued by the source account). */
export interface CredentialIssueParams {
  /** The destination (holder) r-address the credential is about. */
  readonly destination: string
  /** The credential type (plain string; hex-encoded on the ledger). */
  readonly credType: string
  /** Expiration (seconds since the Ripple epoch). */
  readonly expiration?: number
  /** An optional URI (plain string; hex-encoded on the ledger). */
  readonly URI?: string
}

/** Parameters for `Credential.accept` (accepted by the holder). */
export interface CredentialAcceptParams {
  /** The credential type (plain string; hex-encoded on the ledger). */
  readonly credType: string
  /** The issuer r-address. */
  readonly issuer: string
}

/** Parameters for `Credential.delete` (by the issuer or the holder). */
export interface CredentialDeleteParams {
  /** The credential type (plain string; hex-encoded on the ledger). */
  readonly credType: string
  /** The holder r-address (set when deleting as the issuer). */
  readonly holder?: string
  /** The issuer r-address (set when deleting as the holder). */
  readonly issuer?: string
}

/** Which side of a credential the query is from. Defaults to `holder`. */
export type CredentialRole = 'holder' | 'issuer'

/** Identifies a credential (all plain strings — never hex). */
export interface CredentialRef {
  /** The credential type. */
  readonly credType: string
  /** The issuer r-address. */
  readonly issuer: string
  /** The holder (subject) r-address. */
  readonly holder: string
}

/** A shaped credential (from `ledger_entry` / `account_objects`); no hex. */
export interface CredentialData extends CredentialRef {
  /** Whether the holder has accepted the credential (`lsfAccepted`). */
  readonly accepted: boolean
  /** The optional URI (decoded from hex). */
  readonly uri?: string
  /** Expiration (seconds since the Ripple epoch), if set. */
  readonly expiration?: number
}

/** Parameters for {@link Credential.retrieve}. */
export interface CredentialRetrieveParams {
  /** The credential type. */
  readonly credType: string
  /** The issuer r-address. */
  readonly issuer: string
  /**
   * The holder (subject).
   *
   * @defaultValue The primary signer's account.
   */
  readonly account?: string
}

/** Result of {@link Credential.retrieve}. */
export interface CredentialRetrieveResult extends CredentialRef {
  /** The credential snapshot, or `undefined` if none exists. */
  readonly data: CredentialData | undefined
}

/** Parameters for {@link Credential.list}. */
export interface CredentialListParams {
  /**
   * Query as `holder` or `issuer`.
   *
   * @defaultValue `'holder'`
   */
  readonly role?: CredentialRole
  /**
   * The account whose credentials to list.
   *
   * @defaultValue The primary signer's account.
   */
  readonly account?: string
}

/** Result of {@link Credential.list}: `credentials[i]` corresponds to `data[i]`. */
export interface CredentialListResult {
  /** The identifier of each credential. */
  readonly credentials: readonly CredentialRef[]
  /** The shaped credentials. */
  readonly data: readonly CredentialData[]
}
