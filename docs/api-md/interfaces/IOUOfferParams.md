# Interface: IOUOfferParams

Defined in: [verticals/iou.types.ts:126](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L126)

Parameters for [IOU.buyOffer](../classes/IOU.md#buyoffer) and [IOU.sellOffer](../classes/IOU.md#selloffer).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [verticals/iou.types.ts:128](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L128)

The number of units of this IOU to buy or sell.

***

### domainID?

> `readonly` `optional` **domainID**: `string`

Defined in: [verticals/iou.types.ts:143](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L143)

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

Defined in: [verticals/iou.types.ts:150](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L150)

Whether a domain-scoped offer also works the open DEX (hybrid). Only
meaningful together with `domainID`.

#### Default Value

`true` when `domainID` is set (otherwise not applicable).

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [verticals/iou.types.ts:152](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L152)

A prior offer sequence to replace.

***

### orderType

> `readonly` **orderType**: [`IOUOrderType`](../type-aliases/IOUOrderType.md)

Defined in: [verticals/iou.types.ts:130](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L130)

The order type.

***

### price

> `readonly` **price**: [`IOUOfferPrice`](../type-aliases/IOUOfferPrice.md)

Defined in: [verticals/iou.types.ts:135](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L135)

What's offered in payment ([IOU.buyOffer](../classes/IOU.md#buyoffer)) or wanted in return
([IOU.sellOffer](../classes/IOU.md#selloffer)) — XRP, an MPT, or another IOU.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
