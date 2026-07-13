import { AccountSetAsfFlags } from 'xrpl'
import type { AccountSet, IssuedCurrencyAmount, Payment, TrustSet } from 'xrpl'

import type { SimpleXRPLClient } from '../client/index.js'
import type { AccountSelector, SubmissionResult } from '../domain/index.js'
import { runMultiStep } from '../orchestration/index.js'
import type { MultiStepPipelineStep } from '../orchestration/index.js'

/** Parameters for {@link IOU.issue}. */
export interface IOUIssueParams {
  /**
   * The issuing account. Must resolve to a registered signer account — it
   * signs the `AccountSet` and issuance `Payment` steps.
   */
  readonly issuer: AccountSelector
  /**
   * The holding account. Must resolve to a registered signer account — it
   * signs the `TrustSet` step (the holder authorizes the trust line).
   */
  readonly holder: AccountSelector
  /**
   * The currency code: a 3-character ISO-4217-style code or a 40-character
   * hex code. Passed through as-is; encoding a non-standard code to hex is
   * the caller's responsibility until the amount/asset model lands.
   */
  readonly currency: string
  /** The trust line limit and issuance amount, as a decimal string. */
  readonly value: string
}

/** Parameters for {@link IOU.transfer}. */
export interface IOUTransferParams {
  /**
   * The destination r-address. A bare address, not an {@link AccountSelector} —
   * the recipient need not be a signer account on this client (TDD's `Token`
   * vertical sketch uses the same `to: string` shape).
   */
  readonly to: string
  /** The currency code (see {@link IOUIssueParams.currency}). */
  readonly currency: string
  /** The token's issuer r-address. */
  readonly issuer: string
  /** The amount to send, as a decimal string. */
  readonly value: string
}

/**
 * Build the issuer-side `AccountSet` that enables rippling for the issued
 * currency (TDD §9.4 — the first step of `IOU.issue`).
 *
 * @param account - The issuer's r-address.
 * @returns The `AccountSet` transaction (Build-stage: intrinsic fields only).
 */
function buildAccountSet(account: string): AccountSet {
  return {
    TransactionType: 'AccountSet',
    Account: account,
    SetFlag: AccountSetAsfFlags.asfDefaultRipple,
  }
}

/**
 * Build the holder-side `TrustSet` extending trust to the issuer.
 *
 * @param account - The holder's r-address.
 * @param limitAmount - The currency, issuer, and trust limit.
 * @returns The `TrustSet` transaction (Build-stage: intrinsic fields only).
 */
function buildTrustSet(
  account: string,
  limitAmount: IssuedCurrencyAmount,
): TrustSet {
  return {
    TransactionType: 'TrustSet',
    Account: account,
    LimitAmount: limitAmount,
  }
}

/**
 * Build a `Payment` moving an issued-currency amount from one account to
 * another. Shared by the final step of `IOU.issue` and by `IOU.transfer`.
 *
 * @param from - The sending r-address.
 * @param to - The destination r-address.
 * @param amount - The currency, issuer, and value to send.
 * @returns The `Payment` transaction (Build-stage: intrinsic fields only).
 */
function buildIssuedPayment(
  from: string,
  to: string,
  amount: IssuedCurrencyAmount,
): Payment {
  return {
    TransactionType: 'Payment',
    Account: from,
    Destination: to,
    Amount: amount,
  }
}

/**
 * The `IOU` vertical: issuance and transfer of issued-currency tokens.
 *
 * `issue` is the multi-step verb DGE-7459 introduces the orchestrator for
 * (TDD §9.4): it expands into an ordered `AccountSet` + `TrustSet` +
 * `Payment` sequence across the issuer and holder accounts, committing each
 * step before the next via {@link runMultiStep}. `transfer` is the matching
 * single-step verb a caller re-runs to finish a partially-committed `issue`
 * (TDD §8 — "the caller re-runs only the remaining step... not the whole
 * verb").
 */
export class IOU {
  private readonly client: SimpleXRPLClient

  /**
   * Construct the IOU vertical.
   *
   * @param client - The client whose registered accounts this vertical acts on.
   */
  public constructor(client: SimpleXRPLClient) {
    this.client = client
  }

  /**
   * Issue an IOU: enable rippling on the issuer, extend trust from the
   * holder, then pay the issuance amount from issuer to holder.
   *
   * @param params - The issuer, holder, currency, and value.
   * @returns The three steps' results, in order.
   * @throws {@link MultiStepFailureError} if any step fails; carries the
   * already-committed results and the failed step's index and error.
   */
  public async issue(
    params: IOUIssueParams,
  ): Promise<readonly SubmissionResult[]> {
    const issuer = this.client.resolveAccount(params.issuer)
    const holder = this.client.resolveAccount(params.holder)
    const amount: IssuedCurrencyAmount = {
      currency: params.currency,
      issuer: issuer.address,
      value: params.value,
    }

    const steps: MultiStepPipelineStep[] = [
      { tx: buildAccountSet(issuer.address), account: issuer },
      { tx: buildTrustSet(holder.address, amount), account: holder },
      {
        tx: buildIssuedPayment(issuer.address, holder.address, amount),
        account: issuer,
      },
    ]
    return runMultiStep(steps)
  }

  /**
   * Send an issued-currency amount to a destination address. The single-step
   * verb used both for ordinary transfers and to complete a partially-issued
   * `IOU.issue` (its final `Payment` step).
   *
   * @param params - The destination, currency, issuer, and value.
   * @param opts - Optional settings.
   * @param opts.from - The source account (defaults to the primary signer).
   * @returns The payment's submission result.
   */
  public async transfer(
    params: IOUTransferParams,
    opts?: { from?: AccountSelector },
  ): Promise<SubmissionResult> {
    const from = this.client.resolveAccount(opts?.from)
    const amount: IssuedCurrencyAmount = {
      currency: params.currency,
      issuer: params.issuer,
      value: params.value,
    }
    const tx = buildIssuedPayment(from.address, params.to, amount)
    return from.signer.submitAndWait(tx, { account: from })
  }
}
