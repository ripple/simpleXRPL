import { MPTokenAuthorizeFlags, MPTokenIssuanceSetFlags } from 'xrpl'
import type {
  MPTokenAuthorize,
  MPTokenIssuanceCreate,
  MPTokenIssuanceDestroy,
  MPTokenIssuanceSet,
  OfferCancel,
  OfferCreate,
  Payment,
} from 'xrpl'

import { toLedgerAmount } from '../amount/index.js'
import type { SubmissionResult } from '../domain/index.js'
import { IntentValidationError } from '../errors.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import {
  extractMptIssuanceId,
  issueFlags,
  offerFlags,
  toDexAmount,
} from './token.helpers.js'
import type {
  CancelOfferParams,
  CreateOfferParams,
  MptAuthorizeParams,
  MptDestroyParams,
  MptIssueIntent,
  MptIssueParams,
  MptSetParams,
  TokenTransferParams,
  TokenWriteOptions,
} from './token.types.js'

/**
 * The Token vertical: the Multi-Purpose Token (MPT) family and DEX offers.
 */
export class Token {
  private readonly host: SubmissionHost

  /**
   * Construct the Token vertical.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Create a new MPT issuance.
   *
   * @param params - Issuance settings and capability flags.
   * @param options - Source account and fee override.
   * @returns The result, with the new `mptIssuanceId` as its intent output.
   */
  public async issue(
    params: MptIssueParams = {},
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<MptIssueIntent>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: MPTokenIssuanceCreate = {
      TransactionType: 'MPTokenIssuanceCreate',
      Account: account.address,
    }
    if (params.assetScale !== undefined) {
      tx.AssetScale = params.assetScale
    }
    if (params.maximumAmount !== undefined) {
      tx.MaximumAmount = params.maximumAmount
    }
    if (params.transferFee !== undefined) {
      tx.TransferFee = params.transferFee
    }
    if (params.metadata !== undefined) {
      tx.MPTokenMetadata = Buffer.from(params.metadata, 'utf8')
        .toString('hex')
        .toUpperCase()
    }
    const flags = issueFlags(params.flags)
    if (flags !== undefined) {
      tx.Flags = flags
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, { mptIssuanceId: extractMptIssuanceId(result) })
  }

  /**
   * Authorize (or un-authorize) a holder for an MPT issuance.
   *
   * @param params - The issuance id, optional holder, and direction.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async authorize(
    params: MptAuthorizeParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: MPTokenAuthorize = {
      TransactionType: 'MPTokenAuthorize',
      Account: account.address,
      MPTokenIssuanceID: params.mptIssuanceId,
    }
    if (params.holder !== undefined) {
      tx.Holder = params.holder
    }
    if (params.unauthorize) {
      tx.Flags = MPTokenAuthorizeFlags.tfMPTUnauthorize
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, { mptIssuanceId: params.mptIssuanceId })
  }

  /**
   * Lock or unlock an MPT issuance (or a specific holder's balance).
   *
   * @param params - The issuance id, optional holder, and lock direction.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async set(
    params: MptSetParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string; locked: boolean }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: MPTokenIssuanceSet = {
      TransactionType: 'MPTokenIssuanceSet',
      Account: account.address,
      MPTokenIssuanceID: params.mptIssuanceId,
      Flags: params.lock
        ? MPTokenIssuanceSetFlags.tfMPTLock
        : MPTokenIssuanceSetFlags.tfMPTUnlock,
    }
    if (params.holder !== undefined) {
      tx.Holder = params.holder
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, {
      mptIssuanceId: params.mptIssuanceId,
      locked: params.lock,
    })
  }

  /**
   * Destroy an MPT issuance (only when no tokens are outstanding).
   *
   * @param params - The issuance id.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async destroy(
    params: MptDestroyParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: MPTokenIssuanceDestroy = {
      TransactionType: 'MPTokenIssuanceDestroy',
      Account: account.address,
      MPTokenIssuanceID: params.mptIssuanceId,
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, { mptIssuanceId: params.mptIssuanceId })
  }

  /**
   * Send an MPT amount to another account.
   *
   * @param params - Destination and MPT amount.
   * @param options - Source account and fee override.
   * @returns The result, echoing the transfer as its intent output.
   * @throws {@link IntentValidationError} if the amount's asset is not an MPT.
   */
  public async transfer(
    params: TokenTransferParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ to: string; amount: string }>> {
    if (params.amount.asset.kind !== 'mpt') {
      throw new IntentValidationError(
        'Token.transfer requires an MPT amount; use xrp.transfer for XRP.',
      )
    }
    const account = this.host.resolveAccount(options?.from)
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: account.address,
      Destination: params.to,
      Amount: toLedgerAmount(params.amount),
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, { to: params.to, amount: params.amount.value })
  }

  /**
   * Place an offer on the decentralized exchange.
   *
   * @param params - The amounts to give and receive, plus offer flags.
   * @param options - Source account and fee override.
   * @returns The submission result.
   * @throws {@link IntentValidationError} if either amount is an MPT.
   */
  public async createOffer(
    params: CreateOfferParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: OfferCreate = {
      TransactionType: 'OfferCreate',
      Account: account.address,
      TakerGets: toDexAmount(params.takerGets),
      TakerPays: toDexAmount(params.takerPays),
    }
    if (params.expiration !== undefined) {
      tx.Expiration = params.expiration
    }
    if (params.offerSequence !== undefined) {
      tx.OfferSequence = params.offerSequence
    }
    const flags = offerFlags(params.flags)
    if (flags !== undefined) {
      tx.Flags = flags
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, undefined)
  }

  /**
   * Cancel a standing offer.
   *
   * @param params - The sequence number of the offer to cancel.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async cancelOffer(
    params: CancelOfferParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ offerSequence: number }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: account.address,
      OfferSequence: params.offerSequence,
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, { offerSequence: params.offerSequence })
  }
}
