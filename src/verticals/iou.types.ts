import type { AccountSelector, FeeIntent } from '../domain/index.js'

/**
 * Identifies which IOU an operation targets. Every IOU write except
 * {@link IOU.cancelOffer} names its currency; the issuer is the acting account
 * (see {@link IOUWriteOptions.from}).
 */
export interface IOURef {
  /**
   * The currency code: a 3-character ISO-4217-style code or a 40-character
   * hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
   * the 40-character hex form.
   */
  readonly ticker: string
}

/**
 * Source account and fee overrides shared by the IOU write verbs. The
 * resolved account is the IOU's issuer — it signs, and its address is the
 * currency issuer.
 */
export interface IOUWriteOptions {
  /** Issuer account; defaults to the primary signer's primary account. */
  readonly from?: AccountSelector

  /** Fee override. */
  readonly fee?: FeeIntent

  /**
   * A prior submission's `idempotencyKey` (from its result), to retry to the
   * same intent instead of creating a duplicate (§8). Auto-generated when omitted.
   */
  readonly idempotencyKey?: string
}

/** Parameters for {@link IOU.issue}. */
export interface IOUIssueParams {
  /**
   * The currency code: a 3-character ISO-4217-style code or a 40-character
   * hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
   * the 40-character hex form.
   */
  readonly ticker: string
}

/** Output attached to an {@link IOU.issue} result. */
export interface IOUIssueIntent {
  /** Currency code and issuer of the new IOU, e.g. `USD.rIssuer...`. */
  readonly iouID: string
}

/** Parameters for {@link IOU.authorize}. */
export interface IOUAuthorizeParams extends IOURef {
  /** The holder's r-address being authorized. */
  readonly holder: string
}

/** Output attached to an {@link IOU.authorize} result. */
export interface IOUAuthorizeIntent {
  /** The holder's r-address that was authorized. */
  readonly holder: string
}

/** Parameters for {@link IOU.lock} and {@link IOU.unlock}. */
export interface IOULockParams extends IOURef {
  /** The holder's r-address whose trust line is (un)locked. */
  readonly holder: string
}

/** Output attached to an {@link IOU.lock} or {@link IOU.unlock} result. */
export interface IOULockIntent {
  /** The holder's r-address whose trust line was (un)locked. */
  readonly holder: string
}

/** Parameters for {@link IOU.clawback}. */
export interface IOUClawbackParams extends IOURef {
  /** The holder's r-address to claw the currency back from. */
  readonly holder: string
  /** The amount to claw back. */
  readonly amount: number
}

/** Output attached to an {@link IOU.clawback} result. */
export interface IOUClawbackIntent {
  /** The holder's r-address clawed back from. */
  readonly holder: string
  /** The amount clawed back. */
  readonly amount: number
}

/** Parameters for {@link IOU.transfer}. */
export interface IOUTransferParams extends IOURef {
  /** The destination r-address. */
  readonly destination: string
  /** The amount to send. */
  readonly amount: number
}

/** Output attached to an {@link IOU.transfer} result. */
export interface IOUTransferIntent {
  /** Destination r-address. */
  readonly destination: string
  /** Amount sent. */
  readonly amount: number
}

/** How a DEX offer is priced. */
export type IOUOfferPrice =
  | { readonly currency: 'XRP'; readonly amount: number }
  | { readonly mptIssuanceId: string; readonly amount: number }
  | {
      readonly ticker: string
      readonly issuer: string
      readonly amount: number
    }

/**
 * How an offer is worked, per the API mapping's `token.buysell types` tab:
 * `limit` places the order untouched; `market` fills immediately or cancels;
 * `fok` fills completely or cancels; `passive` never crosses a matching offer.
 */
export type IOUOrderType = 'limit' | 'market' | 'fok' | 'passive'

/** Parameters for {@link IOU.buyOffer} and {@link IOU.sellOffer}. */
export interface IOUOfferParams extends IOURef {
  /** The number of units of this IOU to buy or sell. */
  readonly amount: number
  /** The order type. */
  readonly orderType: IOUOrderType
  /**
   * What's offered in payment ({@link IOU.buyOffer}) or wanted in return
   * ({@link IOU.sellOffer}) — XRP, an MPT, or another IOU.
   */
  readonly price: IOUOfferPrice
  /**
   * Restrict the offer to a permissioned domain. Omit for the open DEX. When
   * set, the offer defaults to hybrid (also crosses the open DEX) unless
   * `hybrid` is explicitly `false`.
   */
  readonly domainID?: string
  /**
   * Whether a domain-scoped offer also works the open DEX (hybrid). Only
   * meaningful with `domainID`; defaults to `true` when `domainID` is set.
   */
  readonly hybrid?: boolean
  /** A prior offer sequence to replace. */
  readonly offerSequence?: number
}

/** Parameters for {@link IOU.cancelOffer}. */
export interface IOUCancelOfferParams {
  /** The sequence number of the offer to cancel. */
  readonly offerSequence: number
}

/** Which side of a trust line the query is from. Defaults to `holder`. */
export type IOURole = 'holder' | 'issuer'

/** A shaped trust line (from `account_lines`), the point-in-time IOU state. */
export interface IOUTrustLine {
  /** The currency ticker (hex codes decoded to ASCII where printable). */
  readonly currency: string
  /** The counterparty r-address (the issuer, when querying as `holder`). */
  readonly peer: string
  /** The trust-line balance, from the queried account's perspective. */
  readonly balance: string
  /** The queried account's trust limit. */
  readonly limit: string
  /** The counterparty's trust limit. */
  readonly limitPeer: string
  /** Whether rippling is disabled on this line (`no_ripple`). */
  readonly noRipple: boolean
  /** Whether the queried account has frozen this line. */
  readonly frozen: boolean
  /** Whether the line is authorized (issuer authorized the holder). */
  readonly authorized: boolean
}

/** Parameters for {@link IOU.retrieve}. */
export interface IOURetrieveParams extends IOURef {
  /** The IOU issuer's r-address. */
  readonly issuer: string
  /** The holder account to read from; defaults to the primary signer's account. */
  readonly account?: string
}

/** Result of {@link IOU.retrieve}. */
export interface IOURetrieveResult {
  /** Currency code and issuer, e.g. `USD.rIssuer...` — pass to write verbs. */
  readonly iouID: string
  /** The point-in-time trust-line snapshot, or `undefined` if no line exists. */
  readonly data: IOUTrustLine | undefined
}

/** Parameters for {@link IOU.list}. */
export interface IOUListParams {
  /** Query as `holder` (default) or `issuer`. */
  readonly role?: IOURole
  /** The account whose trust lines to list; defaults to the primary signer's. */
  readonly account?: string
}

/** Result of {@link IOU.list}: `ious[i]` corresponds to `data[i]`. */
export interface IOUListResult {
  /** The `iouID` of each line, composable into the write verbs. */
  readonly ious: readonly string[]
  /** The shaped trust lines. */
  readonly data: readonly IOUTrustLine[]
}

/** Parameters for {@link IOU.listOffers}. */
export interface IOUListOffersParams extends IOURef {
  /** The IOU issuer's r-address. */
  readonly issuer: string
}
