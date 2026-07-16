import type { MPTokenMetadata } from 'xrpl'

import type { Amount } from '../amount/index.js'
import type { AccountSelector, FeeIntent } from '../domain/index.js'

/** Per-call options shared by the token verbs. */
export interface TokenWriteOptions {
  /** Source account; defaults to the primary signer's primary account. */
  readonly from?: AccountSelector

  /** Fee override. */
  readonly fee?: FeeIntent
}

/** Capability flags for an MPT issuance. */
export interface MptIssueFlags {
  /** The issuer can lock the token (globally or per-holder). */
  readonly canLock?: boolean
  /** Holders must be authorized before they can hold the token. */
  readonly requireAuth?: boolean
  /** The token can be used in escrows. */
  readonly canEscrow?: boolean
  /** The token can be traded on the DEX. */
  readonly canTrade?: boolean
  /** The token can be transferred between holders. */
  readonly canTransfer?: boolean
  /** The issuer can claw back the token. */
  readonly canClawback?: boolean
}

/** Parameters for `Token.issue`. */
export interface MptIssueParams {
  /** Decimal places between display value and base units. */
  readonly assetScale?: number
  /** Maximum issuable amount, in base units. */
  readonly maximumAmount?: string
  /** Transfer fee on secondary sales, as a percentage (0.5 = 0.5%, 0–50). */
  readonly transferFee?: number
  /**
   * Token metadata (required): a structured object (encoded per the XLS-89
   * standard) or a raw string (UTF-8 hex-encoded as-is). Either way it is
   * validated against XLS-89; non-adherence is rejected.
   */
  readonly metadata: MPTokenMetadata | string
  /** Capability flags. */
  readonly flags?: MptIssueFlags
}

/** Parameters for `Token.authorize` / `Token.unauthorize` (calling account). */
export interface MptAuthorizeParams {
  /** The MPT issuance id. */
  readonly mptIssuanceId: string
}

/** Parameters for `Token.grantHolder` / `Token.revokeHolder` (issuer-side). */
export interface MptHolderParams {
  /** The MPT issuance id. */
  readonly mptIssuanceId: string
  /** The holder to grant or revoke. */
  readonly holder: string
}

/** Parameters for `Token.lock` / `Token.unlock`. */
export interface MptLockParams {
  /** The MPT issuance id. */
  readonly mptIssuanceId: string
  /** A specific holder to (un)lock; omit to affect the whole issuance. */
  readonly holder?: string
}

/** Parameters for `Token.destroy`. */
export interface MptDestroyParams {
  /** The MPT issuance id. */
  readonly mptIssuanceId: string
}

/** Parameters for `Token.transfer`. */
export interface TokenTransferParams {
  /** Destination r-address. */
  readonly to: string
  /** The MPT amount to send (its asset must be an MPT). */
  readonly amount: Amount
}

/** Flags for `Token.createOffer`. */
export interface OfferFlags {
  /** Do not consume offers that exactly match. */
  readonly passive?: boolean
  /** Consume matching offers immediately; never place the remainder. */
  readonly immediateOrCancel?: boolean
  /** Consume the full amount or cancel entirely. */
  readonly fillOrKill?: boolean
  /** Interpret the offer as selling `TakerGets`. */
  readonly sell?: boolean
}

/** Parameters for `Token.createOffer`. */
export interface CreateOfferParams {
  /** What the account gives (XRP or IOU — MPT is not DEX-tradeable). */
  readonly takerGets: Amount
  /** What the account wants (XRP or IOU). */
  readonly takerPays: Amount
  /** Offer expiration (seconds since the Ripple epoch). */
  readonly expiration?: number
  /** A prior offer sequence to replace. */
  readonly offerSequence?: number
  /** Offer flags. */
  readonly flags?: OfferFlags
}

/** Parameters for `Token.cancelOffer`. */
export interface CancelOfferParams {
  /** The sequence number of the offer to cancel. */
  readonly offerSequence: number
}

/** Output attached to a `Token.issue` result. */
export interface MptIssueIntent {
  /** The id of the newly created MPT issuance. */
  readonly mptIssuanceId: string
}
