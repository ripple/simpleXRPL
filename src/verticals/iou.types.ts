/**
 * Per-call options for single-step IOU verbs. IOU is an instantiated,
 * issuer-bound vertical, so it exposes no `from`/`fee` here — only the retry
 * key. Multi-step verbs (`issue`, `lock`, `unlock`) generate a fresh id per
 * step instead, and are resumed by re-running the matching single-step verb (§8).
 */
export interface IOUWriteOptions {
  /**
   * A prior submission's `idempotencyKey` (from its result), to retry to the
   * same intent instead of creating a duplicate (§8). Auto-generated when omitted.
   */
  readonly idempotencyKey?: string
}

/** Parameters for {@link IOUVertical.issue}. */
export interface IOUIssueParams {
  /**
   * The currency code: a 3-character ISO-4217-style code or a 40-character
   * hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
   * the 40-character hex form.
   */
  readonly ticker: string
}

/** Parameters for {@link IOU.authorize}. */
export interface IOUAuthorizeParams {
  /** The holder's r-address being authorized. */
  readonly holder: string
}

/** Output attached to an {@link IOU.authorize} result. */
export interface IOUAuthorizeIntent {
  /** The holder's r-address that was authorized. */
  readonly holder: string
}

/** Parameters for {@link IOU.lock} and {@link IOU.unlock}. */
export interface IOULockParams {
  /** The holder's r-address whose trust line is (un)locked. */
  readonly holder: string
}

/** Output attached to an {@link IOU.lock} or {@link IOU.unlock} result. */
export interface IOULockIntent {
  /** The holder's r-address whose trust line was (un)locked. */
  readonly holder: string
}

/** Parameters for {@link IOU.clawback}. */
export interface IOUClawbackParams {
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
export interface IOUTransferParams {
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
export interface IOUOfferParams {
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
