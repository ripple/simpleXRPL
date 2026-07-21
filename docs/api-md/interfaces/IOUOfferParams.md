# Interface: IOUOfferParams

Defined in: [src/verticals/iou.types.ts:85](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L85)

Parameters for [IOU.buyOffer](../classes/IOU.md#buyoffer) and [IOU.sellOffer](../classes/IOU.md#selloffer).

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [src/verticals/iou.types.ts:87](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L87)

The number of units of this IOU to buy or sell.

***

### domainID?

> `readonly` `optional` **domainID**: `string`

Defined in: [src/verticals/iou.types.ts:100](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L100)

Restrict the offer to a permissioned domain. Omit for the open DEX. When
set, the offer defaults to hybrid (also crosses the open DEX) unless
`hybrid` is explicitly `false`.

***

### hybrid?

> `readonly` `optional` **hybrid**: `boolean`

Defined in: [src/verticals/iou.types.ts:105](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L105)

Whether a domain-scoped offer also works the open DEX (hybrid). Only
meaningful with `domainID`; defaults to `true` when `domainID` is set.

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [src/verticals/iou.types.ts:107](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L107)

A prior offer sequence to replace.

***

### orderType

> `readonly` **orderType**: [`IOUOrderType`](../type-aliases/IOUOrderType.md)

Defined in: [src/verticals/iou.types.ts:89](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L89)

The order type.

***

### price

> `readonly` **price**: [`IOUOfferPrice`](../type-aliases/IOUOfferPrice.md)

Defined in: [src/verticals/iou.types.ts:94](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L94)

What's offered in payment ([IOU.buyOffer](../classes/IOU.md#buyoffer)) or wanted in return
([IOU.sellOffer](../classes/IOU.md#selloffer)) — XRP, an MPT, or another IOU.
