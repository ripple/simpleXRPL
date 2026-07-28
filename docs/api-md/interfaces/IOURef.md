# Interface: IOURef

Defined in: [verticals/iou.types.ts:8](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/iou.types.ts#L8)

Identifies which IOU an operation targets. Every IOU write except
[IOU.cancelOffer](../classes/IOU.md#canceloffer) names its currency; the issuer is the acting account
(see [IOUWriteOptions.from](IOUWriteOptions.md#from)).

## Extended by

- [`IOUAuthorizeParams`](IOUAuthorizeParams.md)
- [`IOUClawbackParams`](IOUClawbackParams.md)
- [`IOUListOffersParams`](IOUListOffersParams.md)
- [`IOULockParams`](IOULockParams.md)
- [`IOUOfferParams`](IOUOfferParams.md)
- [`IOURetrieveParams`](IOURetrieveParams.md)
- [`IOUTransferParams`](IOUTransferParams.md)

## Properties

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
