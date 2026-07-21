# Interface: IOURef

Defined in: [src/verticals/iou.types.ts:8](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L8)

Identifies which IOU an operation targets. Every IOU write except
[IOU.cancelOffer](../classes/IOU.md#canceloffer) names its currency; the issuer is the acting account
(see [IOUWriteOptions.from](IOUWriteOptions.md#from)).

## Extended by

- [`IOUAuthorizeParams`](IOUAuthorizeParams.md)
- [`IOUClawbackParams`](IOUClawbackParams.md)
- [`IOULockParams`](IOULockParams.md)
- [`IOUOfferParams`](IOUOfferParams.md)
- [`IOUTransferParams`](IOUTransferParams.md)

## Properties

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
