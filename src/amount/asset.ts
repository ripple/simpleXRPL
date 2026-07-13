/**
 * An asset that can be represented and moved on the XRP Ledger: native XRP, an
 * issued currency (IOU), or a Multi-Purpose Token (MPT).
 */
export type Asset =
  | { readonly kind: 'xrp' }
  | { readonly kind: 'iou'; readonly currency: string; readonly issuer: string }
  | {
      readonly kind: 'mpt'
      readonly mptIssuanceId: string
      readonly scale: number
    }

/** The native XRP asset. */
export const XRP_ASSET: Asset = { kind: 'xrp' }

/**
 * An issued-currency (IOU) asset.
 *
 * @param currency - The currency code (3-char code or 40-char hex).
 * @param issuer - The issuer's r-address.
 * @returns The IOU asset.
 */
export function iou(currency: string, issuer: string): Asset {
  return { kind: 'iou', currency, issuer }
}

/**
 * A Multi-Purpose Token (MPT) asset.
 *
 * @param mptIssuanceId - The MPT issuance id.
 * @param scale - Decimal places between display value and on-ledger base units
 *   (e.g. `2` means a display value of `1.25` is `125` base units). Defaults to `0`.
 * @returns The MPT asset.
 */
export function mpt(mptIssuanceId: string, scale = 0): Asset {
  return { kind: 'mpt', mptIssuanceId, scale }
}
