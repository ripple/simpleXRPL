import type { AccountSelector, FeeIntent } from '../domain/index.js'

/** Per-call options shared by the domain operations. */
export interface DomainWriteOptions {
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

/** A credential accepted by a permissioned domain. */
export interface AcceptedCredential {
  /** The issuer r-address. */
  readonly issuer: string
  /** The credential type (plain string; hex-encoded on the ledger). */
  readonly credType: string
}

/** Parameters for `Domain.create` (a new permissioned domain). */
export interface DomainCreateParams {
  /** The credentials the domain accepts (at least one). */
  readonly credList: readonly AcceptedCredential[]
}

/** Parameters for `Domain.setCredentials` (update an existing domain). */
export interface DomainSetCredentialsParams {
  /** The domain to update. */
  readonly domain: string
  /** The credentials the domain accepts (at least one). */
  readonly credList: readonly AcceptedCredential[]
}

/** Parameters for `Domain.delete`. */
export interface DomainDeleteParams {
  /** The domain to delete. */
  readonly domain: string
}

/** Output attached to a `Domain` write result. */
export interface DomainIntent {
  /** The domain id (supplied for an update, or discovered for a new domain). */
  readonly domainID: string
}

/** A shaped permissioned domain (from `ledger_entry` / `account_objects`). */
export interface DomainData {
  /** The domain's on-chain id. */
  readonly domainID: string
  /** The owning account's r-address. */
  readonly owner: string
  /** The credentials the domain accepts (credential types decoded from hex). */
  readonly credList: readonly AcceptedCredential[]
}

/** Parameters for {@link Domain.retrieve}. */
export interface DomainRetrieveParams {
  /** The domain id to fetch. */
  readonly domainID: string
}

/** Result of {@link Domain.retrieve}. */
export interface DomainRetrieveResult {
  /** The queried domain id. */
  readonly domainID: string
  /** The domain snapshot, or `undefined` if no such domain exists. */
  readonly data: DomainData | undefined
}

/** Parameters for {@link Domain.list}. */
export interface DomainListParams {
  /**
   * The owner whose domains to list.
   *
   * @defaultValue The primary signer's account.
   */
  readonly account?: string
}

/** Result of {@link Domain.list}: `domains[i]` corresponds to `data[i]`. */
export interface DomainListResult {
  /** The domain id of each owned domain. */
  readonly domains: readonly string[]
  /** The shaped domains. */
  readonly data: readonly DomainData[]
}
