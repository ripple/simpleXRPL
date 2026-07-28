import type {
  AuthorizeCredential,
  PermissionedDomainDelete,
  PermissionedDomainSet,
} from 'xrpl'

import type { SubmissionResult } from '../domain/index.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import { listDomains, retrieveDomain } from './domain.reads.js'
import type {
  AcceptedCredential,
  DomainCreateParams,
  DomainDeleteParams,
  DomainIntent,
  DomainListParams,
  DomainListResult,
  DomainRetrieveParams,
  DomainRetrieveResult,
  DomainSetCredentialsParams,
  DomainWriteOptions,
} from './domain.types.js'
import { toHex } from './hex.js'

/**
 * The Domain vertical: create, update, and delete permissioned domains.
 */
export class Domain {
  private readonly host: SubmissionHost

  /**
   * Construct the Domain vertical.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Retrieve a permissioned domain by id (point-in-time). No signer required.
   *
   * @param params - The domain id to fetch.
   * @returns The domain id and snapshot (or `undefined` data if absent).
   */
  public async retrieve(
    params: DomainRetrieveParams,
  ): Promise<DomainRetrieveResult> {
    return retrieveDomain(this.host, params)
  }

  /**
   * List every permissioned domain owned by an account. No signer required.
   *
   * @param params - The owner account (default: the primary signer's account).
   * @returns The domain ids and shaped domains, index-aligned.
   */
  public async list(params?: DomainListParams): Promise<DomainListResult> {
    return listDomains(this.host, params)
  }

  /**
   * Create a new permissioned domain.
   *
   * @param params - The credentials the new domain accepts.
   * @param options - Source account and fee override.
   * @returns The result, with the new domain id as its intent output.
   */
  public async create(
    params: DomainCreateParams,
    options?: DomainWriteOptions,
  ): Promise<SubmissionResult<DomainIntent>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: PermissionedDomainSet = {
      TransactionType: 'PermissionedDomainSet',
      Account: account.address,
      AcceptedCredentials: params.credList.map(toAuthorizeCredential),
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { domainID: extractDomainId(result) })
  }

  /**
   * Update the accepted credentials of an existing permissioned domain.
   *
   * @param params - The domain id and its new accepted credentials.
   * @param options - Source account and fee override.
   * @returns The result, echoing the domain id.
   */
  public async setCredentials(
    params: DomainSetCredentialsParams,
    options?: DomainWriteOptions,
  ): Promise<SubmissionResult<DomainIntent>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: PermissionedDomainSet = {
      TransactionType: 'PermissionedDomainSet',
      Account: account.address,
      DomainID: params.domain,
      AcceptedCredentials: params.credList.map(toAuthorizeCredential),
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { domainID: params.domain })
  }

  /**
   * Delete a permissioned domain.
   *
   * @param params - The domain id to delete.
   * @param options - Source account and fee override.
   * @returns The result, echoing the domain id.
   */
  public async delete(
    params: DomainDeleteParams,
    options?: DomainWriteOptions,
  ): Promise<SubmissionResult<DomainIntent>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: PermissionedDomainDelete = {
      TransactionType: 'PermissionedDomainDelete',
      Account: account.address,
      DomainID: params.domain,
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { domainID: params.domain })
  }
}

/**
 * Map an accepted-credential to the on-ledger AuthorizeCredential shape.
 *
 * @param credential - The issuer and (plain) credential type.
 * @returns The AuthorizeCredential with a hex-encoded credential type.
 */
function toAuthorizeCredential(
  credential: AcceptedCredential,
): AuthorizeCredential {
  return {
    Credential: {
      Issuer: credential.issuer,
      CredentialType: toHex(credential.credType),
    },
  }
}

/**
 * Read a newly created domain's id from a xrpld submission result's metadata.
 *
 * @param result - The submission result.
 * @returns The created domain id, or an empty string when unavailable.
 */
function extractDomainId(result: SubmissionResult): string {
  if (result.source !== 'xrpld') {
    return ''
  }
  const { meta } = result.response.result
  if (meta === undefined || typeof meta === 'string') {
    return ''
  }
  for (const node of meta.AffectedNodes) {
    if (
      'CreatedNode' in node &&
      node.CreatedNode.LedgerEntryType === 'PermissionedDomain'
    ) {
      return node.CreatedNode.LedgerIndex
    }
  }
  return ''
}
