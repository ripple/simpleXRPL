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
import { listBookOffers } from '../reads/offers.js'
import type { ListOffersResult } from '../reads/offers.js'

import {
  assertClawbackEnabled,
  assertDistributableAmount,
  assertRequireAuthEnabled,
  buildAccountSet,
  buildFreeze,
  buildIssuedPayment,
  buildMaxTrustSet,
  buildOfferCreate,
  encodeCurrencyCode,
  iouValue,
  localAccountFromSeed,
  priceToLedgerAmount,
  readIssuanceSeeds,
} from './iou.helpers.js'
import { listIous, retrieveIou } from './iou.reads.js'
import type {
  IOUAuthorizeIntent,
  IOUAuthorizeParams,
  IOUCancelOfferParams,
  IOUClawbackIntent,
  IOUClawbackParams,
  IOUIssueIntent,
  IOUIssueParams,
  IOUListOffersParams,
  IOUListParams,
  IOUListResult,
  IOULockIntent,
  IOULockParams,
  IOUOfferParams,
  IOURetrieveParams,
  IOURetrieveResult,
  IOUTransferIntent,
  IOUTransferParams,
  IOUWriteOptions,
} from './iou.types.js'

/**
 * The IOU (trust-line currency) vertical, exposed as `client.iou`. Write operations
 * act as the issuer ({@link IOUWriteOptions.from}, default the primary signer);
 * reads take an explicit `account` or default to the primary. Callers name
 * their own counterparty (`holder`/`destination`) per call.
 */
export class IOU {
  private readonly host: SubmissionHost

  /**
   * Construct the IOU vertical.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Generate a new trust-line-based IOU in one call: the issuer enables
   * rippling (`AccountSet`), the hot wallet extends trust to the maximum limit
   * (`TrustSet`), and — when `params.amount` is given — the issuer distributes
   * that amount to the hot wallet (`Payment`), so the issuance ends with value
   * in circulation rather than an empty trust line.
   *
   * Omit `params.amount` to set the trust line up only and distribute later via
   * {@link IOU.transfer} (e.g. issuing in tranches).
   *
   * Two ways to source the issuer and hot wallet:
   * - Pass `params.holder` (a client-owned account) and, optionally, the issuer
   *   via `options.from` (default: the primary signer). Both resolve through the
   *   client's signers, so either can be custody-held (Ripple Custody, Palisade).
   * - Omit `params.holder` to bootstrap both from the `XRPL_ISSUER_SEED` /
   *   `XRPL_HOT_WALLET_SEED` environment seeds (the local dev flow).
   *
   * @param params - The ticker to issue, optionally the holder account and the
   * amount to distribute to it.
   * @param options - Issuer source (`from`, default primary) and fee override.
   * @returns The result, with `{ iouID }` plus the distributed `amount` (when
   * one was requested) as its intent output.
   * @throws {@link IntentValidationError} if the env-seed flow is used and the
   *   required seeds aren't set, or `params.amount` is not a positive finite
   *   number.
   * @throws {@link MultiStepFailureError} if any step fails, carrying the steps
   *   that already committed — a distribution failure leaves the trust line in
   *   place, so it can be retried with {@link IOU.transfer}.
   */
  public async issue(
    params: IOUIssueParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOUIssueIntent>> {
    const { issuer, holder } = this.resolveIssuancePair(params, options)
    const currency = encodeCurrencyCode(params.ticker)
    const steps: SubmitRequest[] = [
      { transaction: buildAccountSet(issuer.address), account: issuer },
      {
        transaction: buildMaxTrustSet(holder.address, currency, issuer.address),
        account: holder,
      },
    ]
    if (params.amount !== undefined) {
      // Distribution must follow the TrustSet: without the limit in place the
      // Payment fails with tecPATH_DRY (no trust line to receive into).
      assertDistributableAmount(params.amount)
      steps.push({
        transaction: buildIssuedPayment(issuer.address, holder.address, {
          currency,
          issuer: issuer.address,
          value: iouValue(params.amount, 'amount'),
        }),
        account: issuer,
      })
    }
    const results = await runMultiStep(this.host, steps)
    return withIntent(results[results.length - 1], {
      iouID: `${currency}.${issuer.address}`,
      amount: params.amount,
    })
  }

  /**
   * Read a single IOU trust line (point-in-time). No signer required.
   *
   * @param params - The ticker, issuer, and optional holder account.
   * @returns The `iouID` and the trust-line snapshot (or `undefined`).
   */
  public async retrieve(params: IOURetrieveParams): Promise<IOURetrieveResult> {
    return retrieveIou(this.host, params)
  }

  /**
   * List every IOU trust line for an account. No signer required.
   *
   * @param params - The role and optional account (default: primary signer's).
   * @returns The `iouID`s and shaped trust lines, index-aligned.
   */
  public async list(params?: IOUListParams): Promise<IOUListResult> {
    return listIous(this.host, params)
  }

  /**
   * List all open offers in the market for this IOU (both sides), tagged
   * buy/sell relative to it. No signer required.
   *
   * @param params - The IOU ticker and issuer to anchor the book on.
   * @returns The shaped offers, composable into `buyOffer`/`sellOffer`.
   */
  public async listOffers(
    params: IOUListOffersParams,
  ): Promise<ListOffersResult> {
    return listBookOffers(this.host, {
      ticker: params.ticker,
      issuer: params.issuer,
    })
  }

  /**
   * Grant authorization for a holder to hold this IOU. Only meaningful when
   * the issuer's account has `asfRequireAuth` set.
   *
   * There is no matching `unauthorize`: the underlying `tfSetfAuth` flag is
   * one-way and cannot be cleared once set. To reversibly block a trust line,
   * use {@link IOU.lock} instead.
   *
   * @param params - The IOU and the holder to authorize.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result, with `{ holder }` as the intent output.
   */
  public async authorize(
    params: IOUAuthorizeParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOUAuthorizeIntent>> {
    const issuer = this.host.resolveAccount(options?.from)
    // Fail fast rather than submit a transaction the ledger will never apply.
    await assertRequireAuthEnabled(this.host, issuer.address)
    const transaction: TrustSet = {
      TransactionType: 'TrustSet',
      Account: issuer.address,
      LimitAmount: {
        currency: encodeCurrencyCode(params.ticker),
        issuer: params.holder,
        value: '0',
      },
      Flags: TrustSetFlags.tfSetfAuth,
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: issuer,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { holder: params.holder })
  }

  /**
   * Freeze a holder's ability to send and receive this IOU: Individual
   * Freeze followed by Deep Freeze.
   *
   * @param params - The IOU and the holder to lock.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The last step's submission result, with `{ holder }` as the
   * intent output.
   * @throws {@link MultiStepFailureError} if either step fails.
   */
  public async lock(
    params: IOULockParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOULockIntent>> {
    return this.setFreeze(
      params,
      [TrustSetFlags.tfSetFreeze, TrustSetFlags.tfSetDeepFreeze],
      options,
    )
  }

  /**
   * Restore a holder's ability to send and receive this IOU: clears Deep
   * Freeze then Individual Freeze.
   *
   * @param params - The IOU and the holder to unlock.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The last step's submission result, with `{ holder }` as the
   * intent output.
   * @throws {@link MultiStepFailureError} if either step fails.
   */
  public async unlock(
    params: IOULockParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOULockIntent>> {
    return this.setFreeze(
      params,
      [TrustSetFlags.tfClearDeepFreeze, TrustSetFlags.tfClearFreeze],
      options,
    )
  }

  /**
   * Reclaim a holder's balance back to the issuer.
   *
   * Verifies the issuer has `asfAllowTrustLineClawback` enabled first
   * (a ledger read), throwing a clear error if not — that flag can only be
   * enabled before the issuer owns any trust lines, offers, or other ledger
   * objects, which this SDK does not itself pre-check.
   *
   * @param params - The IOU, holder, and amount to claw back.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result, with `{ holder, amount }` as the intent
   * output.
   */
  public async clawback(
    params: IOUClawbackParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOUClawbackIntent>> {
    const issuer = this.host.resolveAccount(options?.from)
    await assertClawbackEnabled(this.host, issuer.address)
    const transaction: Clawback = {
      TransactionType: 'Clawback',
      Account: issuer.address,
      Amount: {
        currency: encodeCurrencyCode(params.ticker),
        issuer: params.holder,
        value: iouValue(params.amount, 'amount'),
      },
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: issuer,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { holder: params.holder, amount: params.amount })
  }

  /**
   * Send a specified amount of this IOU to a destination account.
   *
   * @param params - The IOU, destination, and amount.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result, with `{ destination, amount }` as the
   * intent output.
   */
  public async transfer(
    params: IOUTransferParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOUTransferIntent>> {
    const issuer = this.host.resolveAccount(options?.from)
    const amount: IssuedCurrencyAmount = {
      currency: encodeCurrencyCode(params.ticker),
      issuer: issuer.address,
      value: iouValue(params.amount, 'amount'),
    }
    const transaction = buildIssuedPayment(
      issuer.address,
      params.destination,
      amount,
    )
    const result = await submitTransaction(this.host, {
      transaction,
      account: issuer,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, {
      destination: params.destination,
      amount: params.amount,
    })
  }

  /**
   * Place an order on the DEX to acquire more of this IOU.
   *
   * @param params - The IOU, amount to buy, order type, and price offered.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result.
   * @throws {@link IntentValidationError} if `params.price` is MPT-denominated.
   */
  public async buyOffer(
    params: IOUOfferParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    return this.placeOffer(params, false, options)
  }

  /**
   * Place an order on the DEX to sell this IOU.
   *
   * @param params - The IOU, amount to sell, order type, and price wanted.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result.
   * @throws {@link IntentValidationError} if `params.price` is MPT-denominated.
   */
  public async sellOffer(
    params: IOUOfferParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    return this.placeOffer(params, true, options)
  }

  /**
   * Cancel a standing offer placed by this IOU's issuer.
   *
   * @param params - The sequence number of the offer to cancel.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result, with `{ offerSequence }` as the intent
   * output.
   */
  public async cancelOffer(
    params: IOUCancelOfferParams,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<{ offerSequence: number }>> {
    const issuer = this.host.resolveAccount(options?.from)
    const transaction: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: issuer.address,
      OfferSequence: params.offerSequence,
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account: issuer,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { offerSequence: params.offerSequence })
  }

  /**
   * Run the two-step freeze/unfreeze sequence on a holder's trust line.
   *
   * @param params - The IOU and the holder whose line is (un)locked.
   * @param flags - The two `TrustSet` freeze flags, applied in order.
   * @param options - Issuer account and fee override.
   * @returns The last step's result.
   */
  private async setFreeze(
    params: IOULockParams,
    flags: readonly [XrplTrustSetFlags, XrplTrustSetFlags],
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<IOULockIntent>> {
    const issuer = this.host.resolveAccount(options?.from)
    const currency = encodeCurrencyCode(params.ticker)
    const results = await runMultiStep(
      this.host,
      flags.map((flag) => ({
        transaction: buildFreeze(issuer.address, currency, {
          holder: params.holder,
          flag,
        }),
        account: issuer,
        fee: options?.fee,
      })),
    )
    return withIntent(results[results.length - 1], { holder: params.holder })
  }

  /**
   * Build and submit an `OfferCreate` for this IOU, on the given side.
   *
   * @param params - The amount, order type, price, and domain options.
   * @param sell - Whether this is a sell offer.
   * @param options - Issuer account, fee override, and idempotency key (see
   * {@link IOUWriteOptions}).
   * @returns The submission result.
   */
  private async placeOffer(
    params: IOUOfferParams,
    sell: boolean,
    options?: IOUWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const issuer = this.host.resolveAccount(options?.from)
    const own = {
      currency: encodeCurrencyCode(params.ticker),
      issuer: issuer.address,
      value: iouValue(params.amount, 'amount'),
    }
    const price = priceToLedgerAmount(params.price)
    const transaction = buildOfferCreate({
      account: issuer.address,
      takerGets: sell ? own : price,
      takerPays: sell ? price : own,
      orderType: params.orderType,
      sell,
      domainID: params.domainID,
      hybrid: params.hybrid,
      offerSequence: params.offerSequence,
    })
    const result = await submitTransaction(this.host, {
      transaction,
      account: issuer,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, undefined)
  }

  /**
   * Resolve the issuer and hot-wallet accounts for {@link IOU.issue}: from the
   * client's signers when `params.holder` is given (so either can be custody-
   * held), otherwise bootstrapped from the environment seeds.
   *
   * @param params - The issuance params; `holder` selects the mode.
   * @param options - Issuer source override (`from`, default the primary signer).
   * @returns The resolved issuer and holder accounts.
   */
  private resolveIssuancePair(
    params: IOUIssueParams,
    options?: IOUWriteOptions,
  ): { issuer: Account; holder: Account } {
    if (params.holder === undefined) {
      const { issuerSeed, holderSeed } = readIssuanceSeeds()
      return {
        issuer: localAccountFromSeed(issuerSeed),
        holder: localAccountFromSeed(holderSeed),
      }
    }
    return {
      issuer: this.host.resolveAccount(options?.from),
      holder: this.host.resolveAccount(params.holder),
    }
  }
}
