import type { MPTokenMetadata } from 'xrpl'

import type { Amount } from '../amount/index.js'
import type { AccountSelector, FeeIntent } from '../domain/index.js'

/** Per-call options shared by the token verbs. */
export interface TokenWriteOptions {
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

/** An MPT issuance's capability flags, decoded to booleans. */
export interface MptFlags {
  /** The issuer can lock the token. */
  readonly canLock: boolean
  /** Holders must be authorized before holding. */
  readonly requireAuth: boolean
  /** The token can be used in escrows. */
  readonly canEscrow: boolean
  /** The token can be traded on the DEX. */
  readonly canTrade: boolean
  /** The token can be transferred between holders. */
  readonly canTransfer: boolean
  /** The issuer can claw back the token. */
  readonly canClawback: boolean
}

/** A shaped MPT issuance (from `ledger_entry`). */
export interface TokenData {
  /** The MPT issuance id. */
  readonly tokenID: string
  /** The issuer r-address. */
  readonly issuer: string
  /** Decimal places between display value and base units. */
  readonly assetScale: number
  /** Maximum issuable amount (base units), if capped. */
  readonly maximumAmount?: string
  /** Amount currently in circulation (base units). */
  readonly outstandingAmount: string
  /** Secondary-transfer fee, as a percentage. */
  readonly transferFee: number
  /** Capability flags. */
  readonly flags: MptFlags
  /** Decoded XLS-89 metadata, if present and well-formed. */
  readonly metadata?: MPTokenMetadata
}

/** Parameters for {@link Token.retrieve}. */
export interface TokenRetrieveParams {
  /** The MPT issuance id to fetch. */
  readonly mptIssuanceId: string
}

/** Result of {@link Token.retrieve}. */
export interface TokenRetrieveResult {
  /** The queried MPT issuance id. */
  readonly tokenID: string
  /** The issuance snapshot, or `undefined` if no such issuance exists. */
  readonly data: TokenData | undefined
}

/** An entry in {@link Token.list}: a full issuance (issuer) or a holding. */
export interface TokenListEntry {
  /** The MPT issuance id. */
  readonly tokenID: string
  /** The account's balance (present for `role: 'holder'`). */
  readonly balance?: string
  /** The full issuance snapshot (present for `role: 'issuer'`). */
  readonly issuance?: TokenData
}

/** Parameters for {@link Token.list}. */
export interface TokenListParams {
  /** List tokens the account `holder`s (default) or `issuer`d. */
  readonly role?: 'holder' | 'issuer'
  /** The account to query; defaults to the primary signer's account. */
  readonly account?: string
}

/** Result of {@link Token.list}: `tokens[i]` corresponds to `data[i]`. */
export interface TokenListResult {
  /** The MPT issuance id of each token. */
  readonly tokens: readonly string[]
  /** The shaped entries. */
  readonly data: readonly TokenListEntry[]
}

/** Parameters for {@link Token.listOffers}. */
export interface TokenListOffersParams {
  /** The account whose offers to list; defaults to the primary signer's. */
  readonly account?: string
}
