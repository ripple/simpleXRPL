import { xrpToDrops } from 'xrpl'
import type { Payment } from 'xrpl'

import type {
  AccountSelector,
  FeeIntent,
  SubmissionResult,
} from '../domain/index.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

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
   * A prior submission's `idempotencyKey` (from its result), to retry to the
   * same intent instead of creating a duplicate (§8). Auto-generated when omitted.
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
      Amount: xrpToDrops(params.amount),
    }
    const result = await submitTransaction(this.host, {
      transaction,
      account,
      fee: options?.fee,
      idempotencyKey: options?.idempotencyKey,
    })
    return withIntent(result, { to: params.to, amount: params.amount })
  }
}
