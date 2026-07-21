import type { CredentialAccept, CredentialCreate, CredentialDelete } from 'xrpl'

import type { SubmissionResult } from '../domain/index.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import type {
  CredentialAcceptParams,
  CredentialDeleteParams,
  CredentialIssueParams,
  CredentialWriteOptions,
} from './credential.types.js'
import { toHex } from './hex.js'

/**
 * The Credential vertical: issue, accept, and delete on-ledger credentials.
 */
export class Credential {
  private readonly host: SubmissionHost

  /**
   * Construct the Credential vertical.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Issue a credential to a destination account.
   *
   * @param params - Destination, credential type, and optional expiration/URI.
   * @param options - Source account (the issuer) and fee override.
   * @returns The result, echoing the destination and credential type.
   */
  public async issue(
    params: CredentialIssueParams,
    options?: CredentialWriteOptions,
  ): Promise<SubmissionResult<{ destination: string; credType: string }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: CredentialCreate = {
      TransactionType: 'CredentialCreate',
      Account: account.address,
      Subject: params.destination,
      CredentialType: toHex(params.credType),
    }
    if (params.expiration !== undefined) {
      tx.Expiration = params.expiration
    }
    if (params.URI !== undefined) {
      tx.URI = toHex(params.URI)
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, {
      destination: params.destination,
      credType: params.credType,
    })
  }

  /**
   * Accept a credential issued to the source account.
   *
   * @param params - Credential type and issuer.
   * @param options - Source account (the holder) and fee override.
   * @returns The result, echoing the issuer and credential type.
   */
  public async accept(
    params: CredentialAcceptParams,
    options?: CredentialWriteOptions,
  ): Promise<SubmissionResult<{ issuer: string; credType: string }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: CredentialAccept = {
      TransactionType: 'CredentialAccept',
      Account: account.address,
      Issuer: params.issuer,
      CredentialType: toHex(params.credType),
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, {
      issuer: params.issuer,
      credType: params.credType,
    })
  }

  /**
   * Delete a credential (as either its issuer or its holder).
   *
   * @param params - Credential type, plus the counterparty (holder or issuer).
   * @param options - Source account and fee override.
   * @returns The result, echoing the credential type.
   */
  public async delete(
    params: CredentialDeleteParams,
    options?: CredentialWriteOptions,
  ): Promise<SubmissionResult<{ credType: string }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: CredentialDelete = {
      TransactionType: 'CredentialDelete',
      Account: account.address,
      CredentialType: toHex(params.credType),
    }
    if (params.holder !== undefined) {
      tx.Subject = params.holder
    }
    if (params.issuer !== undefined) {
      tx.Issuer = params.issuer
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { credType: params.credType })
  }
}
