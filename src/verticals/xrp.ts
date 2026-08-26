import type { OfferCancel, Payment } from 'xrpl'

import type {
  AccountSelector,
  FeeIntent,
  SubmissionResult,
} from '../domain/index.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import {
  buildOfferCreate,
  priceToLedgerAmount,
  xrpDrops,
} from './iou.helpers.js'
import type { IOUOrderType } from './iou.types.js'

/** Parameters for {@link XRP.transfer}. */
export interface XrpTransferParams {
  /** Destination r-address. */
  readonly to: string

  /** Amount to send, as a decimal string in XRP (e.g. `'10'`, `'0.25'`). */
  readonly amount: string
}

/** Per-call options for {@link XRP.transfer}. */
export interface XrpTransferOptions {
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

/** Output attached to an {@link XRP.transfer} result. */
export interface XrpTransferIntent {
  /** Destination r-address. */
  readonly to: string

  /** Amount sent, in XRP. */
  readonly amount: string
}

/**
 * Source account and fee overrides shared by the XRP offer operations. The
 * resolved account signs the `OfferCreate`/`OfferCancel`.
 */
export interface XrpWriteOptions {
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
 * How an XRP offer is priced: the counter-asset paid ({@link XRP.buyOffer}) or
 * received ({@link XRP.sellOffer}) for the XRP. It is an MPT or another IOU —
 * never XRP, since an XRP-for-XRP offer is meaningless.
 */
export type XrpOfferPrice =
  | { readonly mptIssuanceId: string; readonly amount: string }
  | {
      readonly ticker: string
      readonly issuer: string
      readonly amount: string
    }

/** Parameters for {@link XRP.buyOffer} and {@link XRP.sellOffer}. */
export interface XrpOfferParams {
  /** The amount of XRP to buy or sell, as a decimal string. */
  readonly amount: string
  /** The order type. */
  readonly orderType: IOUOrderType
  /**
   * What's offered in payment ({@link XRP.buyOffer}) or wanted in return
   * ({@link XRP.sellOffer}) — an MPT or another IOU.
   */
  readonly price: XrpOfferPrice
  /**
   * Restrict the offer to a permissioned domain. Omit for the open DEX. When
   * set, the offer defaults to hybrid (also crosses the open DEX) unless
   * `hybrid` is explicitly `false`.
   *
   * @defaultValue Unset — the offer works the open DEX only.
   */
  readonly domainID?: string
  /**
   * Whether a domain-scoped offer also works the open DEX (hybrid). Only
   * meaningful together with `domainID`.
   *
   * @defaultValue `true` when `domainID` is set (otherwise not applicable).
   */
  readonly hybrid?: boolean
  /** A prior offer sequence to replace. */
  readonly offerSequence?: number
}

/** Parameters for {@link XRP.cancelOffer}. */
export interface XrpCancelOfferParams {
  /** The sequence number of the offer to cancel. */
  readonly offerSequence: number
}

/**
 * The XRP helper vertical: native-XRP value transfers.
 */
export class XRP {
  private readonly host: SubmissionHost

  /**
   * Construct the XRP vertical.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Send XRP from one account to another (a `Payment`).
   *
   * @param params - Destination and amount (XRP).
   * @param options - Source account and fee override.
   * @returns The submission result, with `{ to, amount }` as the intent output.
   */
  public async transfer(
    params: XrpTransferParams,
    options?: XrpTransferOptions,
  ): Promise<SubmissionResult<XrpTransferIntent>> {
    const account = this.host.resolveAccount(options?.from)
    const transaction: Payment = {
      TransactionType: 'Payment',
      Account: account.address,
      Destination: params.to,
      Amount: xrpDrops(params.amount, 'amount'),
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { to: params.to, amount: params.amount })
  }

  /**
   * Place an order on the DEX to acquire XRP.
   *
   * @param params - The amount of XRP to buy, order type, and price offered.
   * @param options - Source account, fee override, and idempotency key (see
   * {@link XrpWriteOptions}).
   * @returns The submission result.
   * @throws {@link IntentValidationError} if `params.price` is MPT-denominated.
   */
  public async buyOffer(
    params: XrpOfferParams,
    options?: XrpWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    return this.placeOffer(params, false, options)
  }

  /**
   * Place an order on the DEX to sell XRP.
   *
   * @param params - The amount of XRP to sell, order type, and price wanted.
   * @param options - Source account, fee override, and idempotency key (see
   * {@link XrpWriteOptions}).
   * @returns The submission result.
   * @throws {@link IntentValidationError} if `params.price` is MPT-denominated.
   */
  public async sellOffer(
    params: XrpOfferParams,
    options?: XrpWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    return this.placeOffer(params, true, options)
  }

  /**
   * Cancel a standing offer placed by the acting account.
   *
   * @param params - The sequence number of the offer to cancel.
   * @param options - Source account, fee override, and idempotency key (see
   * {@link XrpWriteOptions}).
   * @returns The submission result, with `{ offerSequence }` as the intent
   * output.
   */
  public async cancelOffer(
    params: XrpCancelOfferParams,
    options?: XrpWriteOptions,
  ): Promise<SubmissionResult<{ offerSequence: number }>> {
    const account = this.host.resolveAccount(options?.from)
    const transaction: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: account.address,
      OfferSequence: params.offerSequence,
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { offerSequence: params.offerSequence })
  }

  /**
   * Build and submit an `OfferCreate` trading XRP against a counter-asset, on
   * the given side. XRP is the base asset; `params.price` is the other side.
   *
   * @param params - The XRP amount, order type, price, and domain options.
   * @param sell - Whether this is a sell offer (offering XRP for the price).
   * @param options - Source account, fee override, and idempotency key (see
   * {@link XrpWriteOptions}).
   * @returns The submission result.
   */
  private async placeOffer(
    params: XrpOfferParams,
    sell: boolean,
    options?: XrpWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const account = this.host.resolveAccount(options?.from)
    const xrp = xrpDrops(params.amount, 'amount')
    const price = priceToLedgerAmount(params.price)
    const transaction = buildOfferCreate({
      account: account.address,
      takerGets: sell ? xrp : price,
      takerPays: sell ? price : xrp,
      orderType: params.orderType,
      sell,
      domainID: params.domainID,
      hybrid: params.hybrid,
      offerSequence: params.offerSequence,
    })
    const result = await submitTransaction(this.host, {
      transaction,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, undefined)
  }
}
