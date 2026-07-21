import type {
  Clawback,
  IssuedCurrencyAmount,
  OfferCancel,
  TrustSet,
  TrustSetFlags as XrplTrustSetFlags,
} from 'xrpl'
import { TrustSetFlags } from 'xrpl'

import type { SubmissionResult } from '../domain/index.js'
import { runMultiStep } from '../orchestration/index.js'
import type { SubmissionHost, SubmitRequest } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import {
  assertClawbackEnabled,
  buildAccountSet,
  buildFreeze,
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
  IOUIssueIntent,
  IOUIssueParams,
  IOULockIntent,
  IOULockParams,
  IOUOfferParams,
  IOUTransferIntent,
  IOUTransferParams,
  IOUWriteOptions,
} from './iou.types.js'

/**
 * The IOU (trust-line currency) vertical, exposed as `client.iou`. Each verb
 * acts as the IOU's **issuer** — the account resolved from
 * {@link IOUWriteOptions.from} (default: the primary signer's account) signs,
 * and its address is the currency issuer. Callers name their own counterparty
 * (`holder`/`destination`) per call.
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
   * Generate a new trust-line-based IOU between two developer-controlled
   * accounts sourced from the environment.
   *
   * Unlike the other verbs, `issue` bootstraps both accounts from the
   * environment rather than {@link IOUWriteOptions.from}: it reads
   * `XRPL_ISSUER_SEED` and `XRPL_HOT_WALLET_SEED`, has the issuer enable
   * rippling (`AccountSet`), then the hot wallet extends trust up to the
   * maximum allowable limit (`TrustSet`) — no `Payment` runs here, so no
   * value exists yet; use {@link IOU.transfer} to send some. IOU tokens need
   * off-chain config for display/interop (see xrplmeta self-publish docs).
   *
   * @param params - The ticker to issue.
   * @returns The result, with `{ iouID }` as its intent output.
   * @throws {@link IntentValidationError} if the required seeds aren't set.
   * @throws {@link MultiStepFailureError} if either step fails.
   */
  public async issue(
    params: IOUIssueParams,
  ): Promise<SubmissionResult<IOUIssueIntent>> {
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
    const results = await runMultiStep(this.host, steps)
    return withIntent(results[results.length - 1], {
      iouID: `${currency}.${issuer.address}`,
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
        value: String(params.amount),
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
      value: String(params.amount),
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
      value: String(params.amount),
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
}
