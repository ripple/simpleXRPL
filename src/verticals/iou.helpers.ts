import {
  AccountSetAsfFlags,
  OfferCreateFlags,
  Wallet,
  convertStringToHex,
  xrpToDrops,
} from 'xrpl'
import type {
  AccountSet,
  IssuedCurrencyAmount,
  OfferCreate,
  Payment,
  TrustSet,
  TrustSetFlags as XrplTrustSetFlags,
} from 'xrpl'

import { LocalSigner } from '../custodians/local/index.js'
import type { Account } from '../domain/index.js'
import { IntentValidationError } from '../errors.js'
import type { SubmissionHost } from '../pipeline/index.js'

import type { IOUOfferPrice, IOUOrderType } from './iou.types.js'

/** `IOU.issue`'s max trust limit is expressed at this many significant digits. */
const MAX_IOU_TRUST_LIMIT_DIGITS = 15

/** A standard currency code is exactly this many ASCII characters. */
const STANDARD_CURRENCY_CODE_LENGTH = 3

/** A valid 40-character hex currency code. */
const HEX_CURRENCY_CODE = /^[0-9A-Fa-f]{40}$/u

/** Hex currency codes are 20 bytes (160 bits), i.e. 40 hex characters. */
const HEX_CURRENCY_LENGTH = 40

/**
 * The largest trust limit expressible without exceeding XRPL issued-currency
 * amounts' 15-significant-digit precision limit (no exponent notation) —
 * used as `IOU.issue`'s trust line limit, per the API mapping's "use max
 * allowable amount for the trustline limit."
 */
export const MAX_IOU_TRUST_LIMIT = '9'.repeat(MAX_IOU_TRUST_LIMIT_DIGITS)

/** The ledger's account-level "allow trust line clawback" flag bit. */
const LSF_ALLOW_TRUSTLINE_CLAWBACK = 0x80000000

/** Environment variable naming the issuing account's seed. */
const ISSUER_SEED_ENV = 'XRPL_ISSUER_SEED'

/** Environment variable naming the hot-wallet account's seed. */
const HOLDER_SEED_ENV = 'XRPL_HOT_WALLET_SEED'

/**
 * Encode a currency code to the form XRPL transactions expect. A standard
 * 3-character code or an already-hex code is passed through unchanged; any
 * other code (e.g. a 5-character ticker like `TBILL`) is UTF-8 hex-encoded and
 * right-padded to 40 hex characters, matching the ecosystem convention for
 * non-standard currency codes.
 *
 * @param currency - The caller-supplied currency code.
 * @returns The code to use as the transaction's `currency` field.
 * @throws {@link IntentValidationError} if the code doesn't fit in 20 bytes.
 */
export function encodeCurrencyCode(currency: string): string {
  if (
    currency.length === STANDARD_CURRENCY_CODE_LENGTH ||
    HEX_CURRENCY_CODE.test(currency)
  ) {
    return currency
  }
  const hex = convertStringToHex(currency)
  if (hex.length > HEX_CURRENCY_LENGTH) {
    throw new IntentValidationError(
      `Currency code is too long to encode (max 20 bytes): '${currency}'`,
    )
  }
  return hex.padEnd(HEX_CURRENCY_LENGTH, '0')
}

/**
 * Convert a DEX offer's price side to the ledger amount `OfferCreate` expects.
 *
 * @param price - The price, denominated in XRP, an MPT, or another IOU.
 * @returns The ledger amount (XRP drops string or issued-currency amount).
 * @throws {@link IntentValidationError} if `price` is MPT-denominated —
 * `OfferCreate`'s `Amount` type has no MPT variant, so the ledger doesn't
 * support MPT-priced offers yet.
 */
export function priceToLedgerAmount(
  price: IOUOfferPrice,
): IssuedCurrencyAmount | string {
  if ('mptIssuanceId' in price) {
    throw new IntentValidationError(
      'IOU offers do not support MPT-denominated prices: OfferCreate has no MPT amount support',
    )
  }
  if ('currency' in price) {
    return xrpToDrops(price.amount)
  }
  return {
    currency: encodeCurrencyCode(price.ticker),
    issuer: price.issuer,
    value: String(price.amount),
  }
}

/** Per-`orderType` flag combinations, before the sell-side `tfSell` bit. */
const ORDER_TYPE_FLAGS: Readonly<Record<IOUOrderType, number>> = {
  limit: 0,
  market: OfferCreateFlags.tfImmediateOrCancel,
  fok: OfferCreateFlags.tfFillOrKill,
  passive: OfferCreateFlags.tfPassive,
}

/**
 * Map an `orderType` (and buy/sell direction) to the `OfferCreate` flags, per
 * the API mapping's `token.buysell types` tab.
 *
 * @param orderType - The order type (`limit`, `market`, `fok`, or `passive`).
 * @param sell - Whether this is a sell offer (adds the `tfSell` bit).
 * @returns The combined flag value, or `undefined` when no bits are set.
 */
export function orderTypeFlags(
  orderType: IOUOrderType,
  sell: boolean,
): number | undefined {
  const base = ORDER_TYPE_FLAGS[orderType]
  // eslint-disable-next-line no-bitwise -- XRPL transaction flags are combined as a bitmask
  const flags = sell ? base | OfferCreateFlags.tfSell : base
  return flags === 0 ? undefined : flags
}

/** Inputs for {@link buildOfferCreate}. */
export interface OfferCreateInputs {
  /** The offering account's r-address. */
  readonly account: string
  /** What the account gives up. */
  readonly takerGets: IssuedCurrencyAmount | string
  /** What the account wants. */
  readonly takerPays: IssuedCurrencyAmount | string
  /** The order type (mapped to flags via {@link orderTypeFlags}). */
  readonly orderType: IOUOrderType
  /** Whether this is a sell offer (adds the `tfSell` bit). */
  readonly sell: boolean
  /** Restrict to a permissioned domain; omit for the open DEX. */
  readonly domainID?: string
  /** Hybrid (also works the open DEX); defaults to `true` when `domainID` set. */
  readonly hybrid?: boolean
  /** A prior offer sequence to replace. */
  readonly offerSequence?: number
}

/**
 * Build an `OfferCreate` transaction from its taker amounts and order type.
 * A `domainID` restricts the offer to a permissioned domain and, unless
 * `hybrid` is explicitly `false`, also sets `tfHybrid` so it works the open DEX.
 *
 * @param inputs - The account, amounts, order type, side, and domain options.
 * @returns The `OfferCreate` transaction (Build-stage: intrinsic fields only).
 */
export function buildOfferCreate(inputs: OfferCreateInputs): OfferCreate {
  const base = orderTypeFlags(inputs.orderType, inputs.sell) ?? 0
  const hybrid = inputs.domainID !== undefined && inputs.hybrid !== false
  // eslint-disable-next-line no-bitwise -- XRPL transaction flags are combined as a bitmask
  const flags = hybrid ? base | OfferCreateFlags.tfHybrid : base
  const tx: OfferCreate = {
    TransactionType: 'OfferCreate',
    Account: inputs.account,
    TakerGets: inputs.takerGets,
    TakerPays: inputs.takerPays,
  }
  if (flags !== 0) {
    tx.Flags = flags
  }
  if (inputs.domainID !== undefined) {
    tx.DomainID = inputs.domainID
  }
  if (inputs.offerSequence !== undefined) {
    tx.OfferSequence = inputs.offerSequence
  }
  return tx
}

/**
 * Build the issuer-side `AccountSet` that enables rippling for the issued
 * currency (the first step of `IOU.issue`).
 *
 * @param account - The issuer's r-address.
 * @returns The `AccountSet` transaction (Build-stage: intrinsic fields only).
 */
export function buildAccountSet(account: string): AccountSet {
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
export function buildTrustSet(
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
 * Build a `TrustSet` extending trust to the maximum IOU limit — the hot-wallet
 * step of {@link IOU.issue}.
 *
 * @param account - The holder (hot wallet) r-address.
 * @param currency - The encoded currency code.
 * @param issuer - The issuer r-address.
 * @returns The built `TrustSet`.
 */
export function buildMaxTrustSet(
  account: string,
  currency: string,
  issuer: string,
): TrustSet {
  return buildTrustSet(account, {
    currency,
    issuer,
    value: MAX_IOU_TRUST_LIMIT,
  })
}

/**
 * Build a single-flag `TrustSet` freeze/unfreeze on a holder's trust line.
 *
 * @param issuerAddress - The issuer's r-address (the signing account).
 * @param currency - The encoded currency code.
 * @param target - The holder and the freeze flag to apply.
 * @param target.holder - The holder's r-address whose line is (un)frozen.
 * @param target.flag - The `TrustSet` freeze flag to apply.
 * @returns The built `TrustSet`.
 */
export function buildFreeze(
  issuerAddress: string,
  currency: string,
  target: { holder: string; flag: XrplTrustSetFlags },
): TrustSet {
  return {
    TransactionType: 'TrustSet',
    Account: issuerAddress,
    LimitAmount: { currency, issuer: target.holder, value: '0' },
    Flags: target.flag,
  }
}

/**
 * Build a `Payment` moving an issued-currency amount from one account to
 * another.
 *
 * @param from - The sending r-address.
 * @param to - The destination r-address.
 * @param amount - The currency, issuer, and value to send.
 * @returns The `Payment` transaction (Build-stage: intrinsic fields only).
 */
export function buildIssuedPayment(
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
 * Build a local `Account` (r-address + in-process signer) from a wallet seed.
 *
 * @param seed - The wallet seed.
 * @returns The account, ready to pass as a `SubmitRequest.account`.
 */
export function localAccountFromSeed(seed: string): Account {
  const wallet = Wallet.fromSeed(seed)
  return { address: wallet.classicAddress, signer: LocalSigner.fromSeed(seed) }
}

/**
 * Read the two bootstrap seeds `IOU.issue` requires, per the API mapping's
 * "TESTNET BEHAVIOR" / "MAINNET BEHAVIOR" notes.
 *
 * @returns The issuer and holder (hot wallet) seeds.
 * @throws {@link IntentValidationError} if either seed is missing, with
 * network-appropriate account-setup guidance.
 */
export function readIssuanceSeeds(): {
  issuerSeed: string
  holderSeed: string
} {
  // eslint-disable-next-line n/no-process-env -- IOU.issue sources its two bootstrap accounts from the environment by design.
  const env = process.env
  const issuerSeed = env[ISSUER_SEED_ENV]
  const holderSeed = env[HOLDER_SEED_ENV]
  if (
    issuerSeed === undefined ||
    issuerSeed === '' ||
    holderSeed === undefined ||
    holderSeed === ''
  ) {
    throw new IntentValidationError(
      `IOU.issue requires ${ISSUER_SEED_ENV} and ${HOLDER_SEED_ENV} in the ` +
        'environment — two accounts, an issuer and a hot wallet. ' +
        'On Testnet: create them with Account.create(), fund them with ' +
        'Account.fund(), then retry. On Mainnet: create them with ' +
        'Account.create(), activate them with Account.activate(), then retry.',
    )
  }
  return { issuerSeed, holderSeed }
}

/**
 * Verify the issuer has enabled `asfAllowTrustLineClawback` before allowing a
 * clawback, per the API mapping's note that the SDK "verifies canClawback was
 * set to true at token creation."
 *
 * @param host - The client the read runs against.
 * @param issuerAddress - The issuer's r-address.
 * @throws {@link IntentValidationError} if the flag is not set.
 */
export async function assertClawbackEnabled(
  host: SubmissionHost,
  issuerAddress: string,
): Promise<void> {
  const response = await host.ledger.request<{
    result: { account_data: { Flags: number } }
  }>({ command: 'account_info', account: issuerAddress })
  const enabled =
    // eslint-disable-next-line no-bitwise -- checking a single ledger flag bit
    (response.result.account_data.Flags & LSF_ALLOW_TRUSTLINE_CLAWBACK) !== 0
  if (!enabled) {
    throw new IntentValidationError(
      `Issuer ${issuerAddress} has not enabled asfAllowTrustLineClawback; IOU.clawback is unavailable`,
    )
  }
}
