import type { AccountSelector, FeeIntent } from '../domain/index.js'

/** Per-call options shared by the credential verbs. */
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
