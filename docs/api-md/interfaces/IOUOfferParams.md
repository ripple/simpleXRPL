# Interface: IOUOfferParams

Defined in: [verticals/iou.types.ts:155](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L155)

Parameters for [IOU.buyOffer](../classes/IOU.md#buyoffer) and [IOU.sellOffer](../classes/IOU.md#selloffer).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `string`

Defined in: [verticals/iou.types.ts:157](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L157)

The number of units of this IOU to buy or sell, as a decimal string.

***

### domainID?

> `readonly` `optional` **domainID**: `string`

Defined in: [verticals/iou.types.ts:172](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L172)

Restrict the offer to a permissioned domain. Omit for the open DEX. When
set, the offer defaults to hybrid (also crosses the open DEX) unless
`hybrid` is explicitly `false`.

#### Default Value

```ts
Unset — the offer works the open DEX only.
```

***

### hybrid?

> `readonly` `optional` **hybrid**: `boolean`

Defined in: [verticals/iou.types.ts:179](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L179)

Whether a domain-scoped offer also works the open DEX (hybrid). Only
meaningful together with `domainID`.

#### Default Value

`true` when `domainID` is set (otherwise not applicable).

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [verticals/iou.types.ts:181](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L181)

A prior offer sequence to replace.

***

### orderType

> `readonly` **orderType**: [`IOUOrderType`](../type-aliases/IOUOrderType.md)

Defined in: [verticals/iou.types.ts:159](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L159)

The order type.

***

### price

> `readonly` **price**: [`IOUOfferPrice`](../type-aliases/IOUOfferPrice.md)

Defined in: [verticals/iou.types.ts:164](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L164)

What's offered in payment ([IOU.buyOffer](../classes/IOU.md#buyoffer)) or wanted in return
([IOU.sellOffer](../classes/IOU.md#selloffer)) — XRP, an MPT, or another IOU.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
