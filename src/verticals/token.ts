import { MPTokenAuthorizeFlags, MPTokenIssuanceSetFlags } from 'xrpl'
import type {
  Clawback,
  MPTokenAuthorize,
  MPTokenIssuanceDestroy,
  MPTokenIssuanceSet,
  Payment,
} from 'xrpl'

import { toLedgerAmount } from '../amount/index.js'
import type { SubmissionResult } from '../domain/index.js'
import { IntentValidationError } from '../errors.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import { buildIssuance, extractMptIssuanceId } from './token.helpers.js'
import { listTokens, retrieveToken } from './token.reads.js'
import type {
  TokenAuthorizeParams,
  TokenDestroyParams,
  TokenHolderParams,
  TokenIssueIntent,
  TokenIssueParams,
  TokenLockParams,
  TokenClawbackParams,
  TokenListParams,
  TokenListResult,
  TokenRetrieveParams,
  TokenRetrieveResult,
  TokenTransferParams,
  TokenWriteOptions,
} from './token.types.js'

/**
 * The Token vertical: the Multi-Purpose Token (MPT) family.
 *
 * DEX offers are not exposed here: the MPT DEX amendment is not yet live
 * on-chain, so MPTs cannot be traded on the order book. XRP/IOU offers belong
 * to the IOU vertical (`client.iou.buyOffer`/`sellOffer`/`cancelOffer`).
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
   * Retrieve a single MPT issuance by id (point-in-time), with flags decoded to
   * booleans and XLS-89 metadata decoded. No signer required.
   *
   * @param params - The MPT issuance id to fetch.
   * @returns The issuance id and snapshot (or `undefined` data if absent).
   */
  public async retrieve(
    params: TokenRetrieveParams,
  ): Promise<TokenRetrieveResult> {
    return retrieveToken(this.host, params)
  }

  /**
   * List the MPTs an account holds (default) or issued. No signer required.
   *
   * @param params - The role and account (default: the primary signer's).
   * @returns The token ids and shaped entries, index-aligned.
   */
  public async list(params?: TokenListParams): Promise<TokenListResult> {
    return listTokens(this.host, params)
  }

  /**
   * Create a new MPT issuance.
   *
   * Applies opinionated, overridable defaults so a bare `issue()` yields a
   * usable token: `assetScale` defaults to `2`, and the capability flags
   * default to a fully capable, transferable token — `canLock`, `canEscrow`,
   * `canTrade`, `canTransfer`, and `canClawback` are all enabled, while
   * `requireAuth` is off. Pass any flag explicitly to override it (e.g.
   * `{ flags: { canClawback: false } }`). MPT capability flags are permanent
   * once the issuance exists.
   *
   * `metadata` is required and validated against the XLS-89 standard, so every
   * issuance is discoverable and properly described. Non-compliant metadata
   * throws an {@link IntentValidationError} before submission; call
   * {@link validateTokenMetadata} to check metadata ahead of time. See the
   * standard at
   * https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema
   *
   * @example
   * ```ts
   * await client.token.issue({
   *   metadata: {
   *     ticker: 'TBILL',              // A-Z/0-9, up to 6 chars
   *     name: 'Acme T-Bill Token',
   *     icon: 'https://acme.example/icon.png',
   *     asset_class: 'rwa',           // rwa | memes | wrapped | gaming | defi | other
   *     asset_subclass: 'treasury',   // required when asset_class is 'rwa'
   *     issuer_name: 'Acme Inc',
   *   },
   * })
   * ```
   *
   * @param params - Issuance settings (metadata required) and flag overrides.
   * @param options - Source account and fee override.
   * @returns The result, with the new `mptIssuanceId` as its intent output.
   */
  public async issue(
    params: TokenIssueParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<TokenIssueIntent>> {
    const account = this.host.resolveAccount(options?.from)

    const result = await submitTransaction(this.host, {
      transaction: buildIssuance(account.address, params),
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })

    // xrpld path: issuance id is in the tx metadata.
    // custody path: poll the Custody transactions API for ledger confirmation.
    let mptIssuanceId = extractMptIssuanceId(result)
    const pollIssuanceId = this.host.pollMptIssuanceId
    if (
      mptIssuanceId === '' &&
      result.intentId !== undefined &&
      pollIssuanceId !== undefined
    ) {
      mptIssuanceId = await pollIssuanceId(result.intentId)
    }
    return withIntent(result, { mptIssuanceId })
  }

  /**
   * Opt the calling account in to hold an MPT issuance.
   *
   * @param params - The issuance id.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async authorize(
    params: TokenAuthorizeParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    return this.submitAuthorize(params, false, options)
  }

  /**
   * Opt the calling account out of holding an MPT issuance (balance must be 0).
   *
   * @param params - The issuance id.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async unauthorize(
    params: TokenAuthorizeParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    return this.submitAuthorize(params, true, options)
  }

  /**
   * Issuer grants a specific holder permission to hold this MPT (allow-listing).
   *
   * @param params - The issuance id and the holder to authorize.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async grantHolder(
    params: TokenHolderParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    return this.submitAuthorize(params, false, options)
  }

  /**
   * Issuer revokes a specific holder's permission to hold this MPT.
   *
   * @param params - The issuance id and the holder to revoke.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async revokeHolder(
    params: TokenHolderParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    return this.submitAuthorize(params, true, options)
  }

  /**
   * Lock an MPT issuance, or a specific holder's balance when `holder` is given.
   *
   * @param params - The issuance id and optional holder.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async lock(
    params: TokenLockParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string; locked: boolean }>> {
    return this.submitLock(params, true, options)
  }

  /**
   * Unlock a previously locked MPT issuance or holder balance.
   *
   * @param params - The issuance id and optional holder.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async unlock(
    params: TokenLockParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string; locked: boolean }>> {
    return this.submitLock(params, false, options)
  }

  /**
   * Destroy an MPT issuance (only when no tokens are outstanding).
   *
   * @param params - The issuance id.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async destroy(
    params: TokenDestroyParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string }>> {
    const account = this.host.resolveAccount(options?.from)
    // The ledger refuses to destroy an issuance that still has tokens in
    // circulation, but it says so as `tecHAS_OBLIGATIONS` — a code that names
    // neither the issuance nor the amount outstanding, and reads as an opaque
    // failure to anyone who has not memorised the tec codes. Check first so the
    // caller is told what is actually holding the destroy up.
    const current = await retrieveToken(this.host, {
      mptIssuanceId: params.mptIssuanceId,
    })
    const outstanding = current.data?.outstandingAmount
    if (outstanding !== undefined && outstanding !== '0') {
      throw new IntentValidationError(
        `MPT issuance ${params.mptIssuanceId} still has ${outstanding} in ` +
          'circulation (base units), so it cannot be destroyed. Have every ' +
          'holder return their balance to the issuer with Token.transfer ' +
          'first, then retry.',
      )
    }
    const tx: MPTokenIssuanceDestroy = {
      TransactionType: 'MPTokenIssuanceDestroy',
      Account: account.address,
      MPTokenIssuanceID: params.mptIssuanceId,
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
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
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { to: params.to, amount: params.amount.value })
  }

  /**
   * Reclaim a holder's MPT balance back to the issuer.
   *
   * Requires the issuance to have been created with `canClawback` (the SDK
   * default). The holder whose balance is reclaimed is named explicitly, and
   * the amount's asset must be an MPT.
   *
   * @param params - The holder and MPT amount to claw back.
   * @param options - Issuer account, fee override, and idempotency key.
   * @returns The result, echoing `{ holder, amount }` as its intent output.
   * @throws {@link IntentValidationError} if the amount's asset is not an MPT.
   */
  public async clawback(
    params: TokenClawbackParams,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ holder: string; amount: string }>> {
    const issuer = this.host.resolveAccount(options?.from)
    const amount = toLedgerAmount(params.amount)
    // A non-MPT amount produces a string (XRP) or an issued-currency object;
    // narrow to the MPT shape Clawback requires, and steer IOU callers away.
    if (typeof amount === 'string' || !('mpt_issuance_id' in amount)) {
      throw new IntentValidationError(
        'Token.clawback requires an MPT amount; use iou.clawback for issued currencies.',
      )
    }
    const transaction: Clawback = {
      TransactionType: 'Clawback',
      Account: issuer.address,
      Amount: amount,
      Holder: params.holder,
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: issuer,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, {
      holder: params.holder,
      amount: params.amount.value,
    })
  }

  /**
   * Build and submit an `MPTokenAuthorize`.
   *
   * @param params - The issuance id and optional specific holder.
   * @param params.mptIssuanceId - The MPT issuance id.
   * @param params.holder - A specific holder to (de)authorize, or self if omitted.
   * @param unauthorize - Whether to set the unauthorize flag.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  private async submitAuthorize(
    params: { readonly mptIssuanceId: string; readonly holder?: string },
    unauthorize: boolean,
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
    if (unauthorize) {
      tx.Flags = MPTokenAuthorizeFlags.tfMPTUnauthorize
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { mptIssuanceId: params.mptIssuanceId })
  }

  /**
   * Build and submit an `MPTokenIssuanceSet` lock/unlock.
   *
   * @param params - The issuance id and optional specific holder.
   * @param params.mptIssuanceId - The MPT issuance id.
   * @param params.holder - A specific holder to (un)lock, or the whole issuance.
   * @param lock - `true` locks, `false` unlocks.
   * @param options - Source account and fee override.
   * @returns The submission result, echoing the lock state.
   */
  private async submitLock(
    params: { readonly mptIssuanceId: string; readonly holder?: string },
    lock: boolean,
    options?: TokenWriteOptions,
  ): Promise<SubmissionResult<{ mptIssuanceId: string; locked: boolean }>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: MPTokenIssuanceSet = {
      TransactionType: 'MPTokenIssuanceSet',
      Account: account.address,
      MPTokenIssuanceID: params.mptIssuanceId,
      Flags: lock
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
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, {
      mptIssuanceId: params.mptIssuanceId,
      locked: lock,
    })
  }
}
