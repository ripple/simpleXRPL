import type {
  Clawback,
  IssuedCurrencyAmount,
  OfferCancel,
  TrustSet,
  TrustSetFlags as XrplTrustSetFlags,
} from 'xrpl'
import { TrustSetFlags } from 'xrpl'

import type { Account, SubmissionResult } from '../domain/index.js'
import { runMultiStep } from '../orchestration/index.js'
import type { SubmissionHost, SubmitRequest } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import {
  assertClawbackEnabled,
  buildAccountSet,
  buildIssuedPayment,
  buildOfferCreate,
  buildTrustSet,
  encodeCurrencyCode,
  localAccountFromSeed,
  MAX_IOU_TRUST_LIMIT,
  priceToLedgerAmount,
  readIssuanceSeeds,
} from './iou.helpers.js'
import type {
  IOUAuthorizeIntent,
  IOUAuthorizeParams,
  IOUCancelOfferParams,
  IOUClawbackIntent,
  IOUClawbackParams,
  IOUIssueParams,
  IOULockIntent,
  IOULockParams,
  IOUOfferParams,
  IOUTransferIntent,
  IOUTransferParams,
} from './iou.types.js'

export type {
  IOUAuthorizeIntent,
  IOUAuthorizeParams,
  IOUCancelOfferParams,
  IOUClawbackIntent,
  IOUClawbackParams,
  IOUIssueParams,
  IOULockIntent,
  IOULockParams,
  IOUOfferParams,
  IOUOfferPrice,
  IOUOrderType,
  IOUTransferIntent,
  IOUTransferParams,
} from './iou.types.js'

/**
 * An issued IOU: the handle {@link IOUVertical.issue} returns, bound to one
 * issuer account and currency. Every instance method signs as that issuer —
 * the "hot wallet" account `issue` also sets up only receives the initial
 * trust line; it isn't a second signing identity later methods use. Callers
 * name their own counterparty (`holder`/`destination`) per call.
 */
export class IOU {
  /** Currency code and issuer of this IOU, e.g. `USD.rIssuer...`. */
  public readonly iouID: string

  private readonly host: SubmissionHost
  private readonly issuer: Account
  private readonly currency: string

  private constructor(host: SubmissionHost, issuer: Account, currency: string) {
    this.host = host
    this.issuer = issuer
    this.currency = currency
    this.iouID = `${currency}.${issuer.address}`
  }

  /**
   * Generate a new trust-line-based IOU between two developer-controlled
   * accounts sourced from the environment.
   *
   * Reads `XRPL_ISSUER_SEED` and `XRPL_HOT_WALLET_SEED`: the issuer enables
   * rippling (`AccountSet`), then the hot wallet extends trust up to the
   * maximum allowable limit (`TrustSet`) — no `Payment` runs here, so no
   * value exists yet; use {@link IOU.transfer} to send some.
   *
   * IOU tokens require additional off-chain configuration for reliable
   * display and interop — see https://xrplmeta.org/issuers/docs/self-publish.
   *
   * @param host - The client the pipeline runs against.
   * @param params - The ticker to issue.
   * @returns The issued IOU handle.
   * @throws {@link IntentValidationError} if the required seeds aren't set.
   * @throws {@link MultiStepFailureError} if either step fails.
   */
  public static async issue(
    host: SubmissionHost,
    params: IOUIssueParams,
  ): Promise<IOU> {
    const { issuerSeed, holderSeed } = readIssuanceSeeds()
    const issuer = localAccountFromSeed(issuerSeed)
    const holder = localAccountFromSeed(holderSeed)
    const currency = encodeCurrencyCode(params.ticker)
    const limitAmount: IssuedCurrencyAmount = {
      currency,
      issuer: issuer.address,
      value: MAX_IOU_TRUST_LIMIT,
    }

    const steps: SubmitRequest[] = [
      { transaction: buildAccountSet(issuer.address), account: issuer },
      {
        transaction: buildTrustSet(holder.address, limitAmount),
        account: holder,
      },
    ]
    await runMultiStep(host, steps)
    return new IOU(host, issuer, currency)
  }

  /**
   * Grant authorization for a holder to hold this IOU. Only meaningful when
   * the issuer's account has `asfRequireAuth` set.
   *
   * There is no matching `unauthorize`: the underlying `tfSetfAuth` flag is
   * one-way and cannot be cleared once set. To reversibly block a trust line,
   * use {@link IOU.lock} instead.
   *
   * @param params - The holder to authorize.
   * @returns The submission result, with `{ holder }` as the intent output.
   */
  public async authorize(
    params: IOUAuthorizeParams,
  ): Promise<SubmissionResult<IOUAuthorizeIntent>> {
    const transaction: TrustSet = {
      TransactionType: 'TrustSet',
      Account: this.issuer.address,
      LimitAmount: {
        currency: this.currency,
        issuer: params.holder,
        value: '0',
      },
      Flags: TrustSetFlags.tfSetfAuth,
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: this.issuer,
    })
    return withIntent(result, { holder: params.holder })
  }

  /**
   * Freeze a holder's ability to send and receive this IOU: Individual
   * Freeze followed by Deep Freeze.
   *
   * @param params - The holder to lock.
   * @returns The last step's submission result, with `{ holder }` as the
   * intent output.
   * @throws {@link MultiStepFailureError} if either step fails.
   */
  public async lock(
    params: IOULockParams,
  ): Promise<SubmissionResult<IOULockIntent>> {
    const results = await runMultiStep(this.host, [
      {
        transaction: this.buildFreeze(params.holder, TrustSetFlags.tfSetFreeze),
        account: this.issuer,
      },
      {
        transaction: this.buildFreeze(
          params.holder,
          TrustSetFlags.tfSetDeepFreeze,
        ),
        account: this.issuer,
      },
    ])
    return withIntent(results[1], { holder: params.holder })
  }

  /**
   * Restore a holder's ability to send and receive this IOU: clears Deep
   * Freeze then Individual Freeze.
   *
   * @param params - The holder to unlock.
   * @returns The last step's submission result, with `{ holder }` as the
   * intent output.
   * @throws {@link MultiStepFailureError} if either step fails.
   */
  public async unlock(
    params: IOULockParams,
  ): Promise<SubmissionResult<IOULockIntent>> {
    const results = await runMultiStep(this.host, [
      {
        transaction: this.buildFreeze(
          params.holder,
          TrustSetFlags.tfClearDeepFreeze,
        ),
        account: this.issuer,
      },
      {
        transaction: this.buildFreeze(
          params.holder,
          TrustSetFlags.tfClearFreeze,
        ),
        account: this.issuer,
      },
    ])
    return withIntent(results[1], { holder: params.holder })
  }

  /**
   * Reclaim a holder's balance back to the issuer.
   *
   * Verifies the issuer has `asfAllowTrustLineClawback` enabled first
   * (a ledger read), throwing a clear error if not — that flag can only be
   * enabled before the issuer owns any trust lines, offers, or other ledger
   * objects, which this SDK does not itself pre-check.
   *
   * @param params - The holder and amount to claw back.
   * @returns The submission result, with `{ holder, amount }` as the intent
   * output.
   */
  public async clawback(
    params: IOUClawbackParams,
  ): Promise<SubmissionResult<IOUClawbackIntent>> {
    await assertClawbackEnabled(this.host, this.issuer.address)
    const transaction: Clawback = {
      TransactionType: 'Clawback',
      Account: this.issuer.address,
      Amount: {
        currency: this.currency,
        issuer: params.holder,
        value: String(params.amount),
      },
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: this.issuer,
    })
    return withIntent(result, { holder: params.holder, amount: params.amount })
  }

  /**
   * Send a specified amount of this IOU to a destination account.
   *
   * @param params - The destination and amount.
   * @returns The submission result, with `{ destination, amount }` as the
   * intent output.
   */
  public async transfer(
    params: IOUTransferParams,
  ): Promise<SubmissionResult<IOUTransferIntent>> {
    const amount: IssuedCurrencyAmount = {
      currency: this.currency,
      issuer: this.issuer.address,
      value: String(params.amount),
    }
    const transaction = buildIssuedPayment(
      this.issuer.address,
      params.destination,
      amount,
    )
    const result = await submitTransaction(this.host, {
      transaction,
      account: this.issuer,
    })
    return withIntent(result, {
      destination: params.destination,
      amount: params.amount,
    })
  }

  /**
   * Place an order on the DEX to acquire more of this IOU.
   *
   * @param params - The amount to buy, order type, and price offered.
   * @returns The submission result.
   * @throws {@link IntentValidationError} if `params.price` is MPT-denominated.
   */
  public async buyOffer(
    params: IOUOfferParams,
  ): Promise<SubmissionResult<undefined>> {
    const transaction = buildOfferCreate({
      account: this.issuer.address,
      takerGets: priceToLedgerAmount(params.price),
      takerPays: {
        currency: this.currency,
        issuer: this.issuer.address,
        value: String(params.amount),
      },
      orderType: params.orderType,
      sell: false,
      offerSequence: params.offerSequence,
    })
    const result = await submitTransaction(this.host, {
      transaction,
      account: this.issuer,
    })
    return withIntent(result, undefined)
  }

  /**
   * Place an order on the DEX to sell this IOU.
   *
   * @param params - The amount to sell, order type, and price wanted.
   * @returns The submission result.
   * @throws {@link IntentValidationError} if `params.price` is MPT-denominated.
   */
  public async sellOffer(
    params: IOUOfferParams,
  ): Promise<SubmissionResult<undefined>> {
    const transaction = buildOfferCreate({
      account: this.issuer.address,
      takerGets: {
        currency: this.currency,
        issuer: this.issuer.address,
        value: String(params.amount),
      },
      takerPays: priceToLedgerAmount(params.price),
      orderType: params.orderType,
      sell: true,
      offerSequence: params.offerSequence,
    })
    const result = await submitTransaction(this.host, {
      transaction,
      account: this.issuer,
    })
    return withIntent(result, undefined)
  }

  /**
   * Cancel a standing offer placed by this IOU's issuer.
   *
   * @param params - The sequence number of the offer to cancel.
   * @returns The submission result, with `{ offerSequence }` as the intent
   * output.
   */
  public async cancelOffer(
    params: IOUCancelOfferParams,
  ): Promise<SubmissionResult<{ offerSequence: number }>> {
    const transaction: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: this.issuer.address,
      OfferSequence: params.offerSequence,
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: this.issuer,
    })
    return withIntent(result, { offerSequence: params.offerSequence })
  }

  private buildFreeze(holder: string, flag: XrplTrustSetFlags): TrustSet {
    return {
      TransactionType: 'TrustSet',
      Account: this.issuer.address,
      LimitAmount: { currency: this.currency, issuer: holder, value: '0' },
      Flags: flag,
    }
  }
}
