# Interface: XrpOfferParams

Defined in: [verticals/xrp.ts:88](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L88)

Parameters for [XRP.buyOffer](../classes/XRP.md#buyoffer) and [XRP.sellOffer](../classes/XRP.md#selloffer).

## Properties

### amount

> `readonly` **amount**: `string`

Defined in: [verticals/xrp.ts:90](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L90)

The amount of XRP to buy or sell, as a decimal string.

***

### domainID?

> `readonly` `optional` **domainID**: `string`

Defined in: [verticals/xrp.ts:105](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L105)

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

Defined in: [verticals/xrp.ts:112](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L112)

Whether a domain-scoped offer also works the open DEX (hybrid). Only
meaningful together with `domainID`.

#### Default Value

`true` when `domainID` is set (otherwise not applicable).

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [verticals/xrp.ts:114](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L114)

A prior offer sequence to replace.

***

### orderType

> `readonly` **orderType**: [`IOUOrderType`](../type-aliases/IOUOrderType.md)

Defined in: [verticals/xrp.ts:92](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L92)

The order type.

***

### price

> `readonly` **price**: [`XrpOfferPrice`](../type-aliases/XrpOfferPrice.md)

Defined in: [verticals/xrp.ts:97](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L97)

What's offered in payment ([XRP.buyOffer](../classes/XRP.md#buyoffer)) or wanted in return
([XRP.sellOffer](../classes/XRP.md#selloffer)) — an MPT or another IOU.
