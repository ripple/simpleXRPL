import type { SubmissionHost } from '../pipeline/index.js'
import { encodeCurrencyCode } from '../verticals/iou.helpers.js'
import type { IOUOfferPrice } from '../verticals/iou.types.js'

import { decodeCurrency, dropsToXrpString } from './read-helpers.js'

/** `lsfPassive` on an `Offer` (matches `tfPassive`). */
const LSF_PASSIVE = 0x00010000

/** An amount as carried on an offer: XRP drops, or an issued-currency amount. */
type OfferAmount =
  | string
  | {
      readonly currency: string
      readonly issuer: string
      readonly value: string
    }

/** Which IOU a book query is anchored to (for buy/sell orientation). */
interface OfferReference {
  readonly ticker: string
  readonly issuer: string
}

/**
 * A shaped open offer. `amount`/`price` mirror the `buyOffer`/`sellOffer` input
 * format (XRP auto-converted from drops), so an offer read here is directly
 * composable back into those write verbs.
 */
export interface OfferSummary {
  /** The offer's sequence number (pass to `cancelOffer`). */
  readonly offerSequence: number
  /** The quantity of the base asset (the IOU/token being traded). */
  readonly amount: number
  /** What is paid/received for it, in `buyOffer`/`sellOffer` price form. */
  readonly price: IOUOfferPrice
  /** Resting offers are `limit`, or `passive` when the passive flag is set. */
  readonly orderType: 'limit' | 'passive'
  /** Whether the offer buys or sells the base asset. */
  readonly type: 'buy' | 'sell'
}

/** Result of a `listOffers` read. */
export interface ListOffersResult {
  /** The shaped open offers. */
  readonly data: readonly OfferSummary[]
}

/**
 * Numeric quantity of an amount (drops converted to XRP).
 *
 * @param amount - The offer amount.
 * @returns The decimal quantity.
 */
function quantityOf(amount: OfferAmount): number {
  return typeof amount === 'string'
    ? Number(dropsToXrpString(amount))
    : Number(amount.value)
}

/**
 * Convert an amount to the `buyOffer`/`sellOffer` price form.
 *
 * @param amount - The offer amount.
 * @returns The price, composable into the offer write verbs.
 */
function toPrice(amount: OfferAmount): IOUOfferPrice {
  if (typeof amount === 'string') {
    return { currency: 'XRP', amount: Number(dropsToXrpString(amount)) }
  }
  return {
    ticker: decodeCurrency(amount.currency),
    issuer: amount.issuer,
    amount: Number(amount.value),
  }
}

/**
 * Whether an amount is the reference IOU.
 *
 * @param amount - The offer amount.
 * @param reference - The anchor IOU.
 * @returns `true` when the amount is that IOU.
 */
function isReference(amount: OfferAmount, reference: OfferReference): boolean {
  return (
    typeof amount !== 'string' &&
    decodeCurrency(amount.currency) === reference.ticker &&
    amount.issuer === reference.issuer
  )
}

/**
 * Decide which side of the offer is the base asset and its buy/sell direction.
 * With a `reference` IOU, that IOU is the base. Otherwise the non-XRP side is
 * the base and XRP is the price (falling back to `takerGets` for IOU/IOU pairs).
 *
 * @param gets - `TakerGets` (what the offerer gives).
 * @param pays - `TakerPays` (what the offerer wants).
 * @param reference - The anchor IOU, if any.
 * @returns The base amount, the price amount, and the trade direction.
 */
function orient(
  gets: OfferAmount,
  pays: OfferAmount,
  reference?: OfferReference,
): { base: OfferAmount; price: OfferAmount; type: 'buy' | 'sell' } {
  if (reference !== undefined && isReference(gets, reference)) {
    return { base: gets, price: pays, type: 'sell' }
  }
  if (reference !== undefined && isReference(pays, reference)) {
    return { base: pays, price: gets, type: 'buy' }
  }
  if (typeof pays === 'string' && typeof gets !== 'string') {
    return { base: gets, price: pays, type: 'sell' }
  }
  if (typeof gets === 'string' && typeof pays !== 'string') {
    return { base: pays, price: gets, type: 'buy' }
  }
  return { base: gets, price: pays, type: 'sell' }
}

/**
 * Shape one raw offer into an {@link OfferSummary}.
 *
 * @param offer - The normalized offer fields.
 * @param offer.takerGets - What the offerer gives.
 * @param offer.takerPays - What the offerer wants.
 * @param offer.sequence - The offer sequence number.
 * @param offer.flags - The offer's ledger flags.
 * @param reference - The anchor IOU, for buy/sell orientation.
 * @returns The shaped offer.
 */
function shapeOffer(
  offer: {
    takerGets: OfferAmount
    takerPays: OfferAmount
    sequence: number
    flags: number
  },
  reference?: OfferReference,
): OfferSummary {
  const { base, price, type } = orient(
    offer.takerGets,
    offer.takerPays,
    reference,
  )
  // eslint-disable-next-line no-bitwise -- test a ledger flag bit.
  const passive = (offer.flags & LSF_PASSIVE) !== 0
  return {
    offerSequence: offer.sequence,
    amount: quantityOf(base),
    price: toPrice(price),
    orderType: passive ? 'passive' : 'limit',
    type,
  }
}

/** An `account_offers` entry (snake_case). */
interface AccountOffer {
  readonly seq: number
  readonly flags?: number
  readonly taker_gets: OfferAmount
  readonly taker_pays: OfferAmount
}

/** A `book_offers` entry (PascalCase ledger object). */
interface BookOffer {
  readonly Sequence: number
  readonly Flags?: number
  readonly TakerGets: OfferAmount
  readonly TakerPays: OfferAmount
}

/**
 * List an account's own resting offers (`account_offers`). No signer required.
 *
 * @param host - The client the read runs against.
 * @param account - The account whose offers to list.
 * @returns The shaped offers.
 */
export async function listAccountOffers(
  host: SubmissionHost,
  account: string,
): Promise<ListOffersResult> {
  const response = await host.ledger.request<{
    result: { offers: readonly AccountOffer[] }
  }>({ command: 'account_offers', account, ledger_index: 'validated' })
  const data = response.result.offers.map((offer) =>
    shapeOffer({
      takerGets: offer.taker_gets,
      takerPays: offer.taker_pays,
      sequence: offer.seq,
      flags: offer.flags ?? 0,
    }),
  )
  return { data }
}

/**
 * Query one side of the order book.
 *
 * @param host - The client the read runs against.
 * @param takerGets - The `taker_gets` currency spec.
 * @param takerPays - The `taker_pays` currency spec.
 * @returns The raw book offers.
 */
async function bookSide(
  host: SubmissionHost,
  takerGets: Readonly<Record<string, string>>,
  takerPays: Readonly<Record<string, string>>,
): Promise<readonly BookOffer[]> {
  const response = await host.ledger.request<{
    result: { offers: readonly BookOffer[] }
  }>({
    command: 'book_offers',
    taker_gets: takerGets,
    taker_pays: takerPays,
    ledger_index: 'validated',
  })
  return response.result.offers
}

/**
 * List all open offers in the market for an IOU (`book_offers`, both sides).
 * No signer required.
 *
 * @param host - The client the read runs against.
 * @param reference - The IOU ticker and issuer to anchor the book on.
 * @returns The shaped offers, tagged buy/sell relative to the IOU.
 */
export async function listBookOffers(
  host: SubmissionHost,
  reference: OfferReference,
): Promise<ListOffersResult> {
  const iou = {
    currency: encodeCurrencyCode(reference.ticker),
    issuer: reference.issuer,
  }
  const xrp = { currency: 'XRP' }
  const [sells, buys] = await Promise.all([
    bookSide(host, iou, xrp),
    bookSide(host, xrp, iou),
  ])
  const data = [...sells, ...buys].map((offer) =>
    shapeOffer(
      {
        takerGets: offer.TakerGets,
        takerPays: offer.TakerPays,
        sequence: offer.Sequence,
        flags: offer.Flags ?? 0,
      },
      reference,
    ),
  )
  return { data }
}
