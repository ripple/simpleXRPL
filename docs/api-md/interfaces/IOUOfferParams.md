# Interface: IOUOfferParams

Defined in: [src/verticals/iou.types.ts:120](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L120)

Parameters for [IOU.buyOffer](../classes/IOU.md#buyoffer) and [IOU.sellOffer](../classes/IOU.md#selloffer).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [src/verticals/iou.types.ts:122](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L122)

The number of units of this IOU to buy or sell.

***

### domainID?

> `readonly` `optional` **domainID**: `string`

Defined in: [src/verticals/iou.types.ts:135](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L135)

Restrict the offer to a permissioned domain. Omit for the open DEX. When
set, the offer defaults to hybrid (also crosses the open DEX) unless
`hybrid` is explicitly `false`.

***

### hybrid?

> `readonly` `optional` **hybrid**: `boolean`

Defined in: [src/verticals/iou.types.ts:140](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L140)

Whether a domain-scoped offer also works the open DEX (hybrid). Only
meaningful with `domainID`; defaults to `true` when `domainID` is set.

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [src/verticals/iou.types.ts:142](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L142)

A prior offer sequence to replace.

***

### orderType

> `readonly` **orderType**: [`IOUOrderType`](../type-aliases/IOUOrderType.md)

Defined in: [src/verticals/iou.types.ts:124](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L124)

The order type.

***

### price

> `readonly` **price**: [`IOUOfferPrice`](../type-aliases/IOUOfferPrice.md)

Defined in: [src/verticals/iou.types.ts:129](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L129)

What's offered in payment ([IOU.buyOffer](../classes/IOU.md#buyoffer)) or wanted in return
([IOU.sellOffer](../classes/IOU.md#selloffer)) — XRP, an MPT, or another IOU.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
