# Interface: CreateOfferParams

Defined in: [src/verticals/token.types.ts:98](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L98)

Parameters for `Token.createOffer`.

## Properties

### expiration?

> `readonly` `optional` **expiration**: `number`

Defined in: [src/verticals/token.types.ts:104](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L104)

Offer expiration (seconds since the Ripple epoch).

***

### flags?

> `readonly` `optional` **flags**: [`OfferFlags`](OfferFlags.md)

Defined in: [src/verticals/token.types.ts:108](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L108)

Offer flags.

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [src/verticals/token.types.ts:106](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L106)

A prior offer sequence to replace.

***

### takerGets

> `readonly` **takerGets**: [`Amount`](Amount.md)

Defined in: [src/verticals/token.types.ts:100](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L100)

What the account gives (XRP or IOU — MPT is not DEX-tradeable).

***

### takerPays

> `readonly` **takerPays**: [`Amount`](Amount.md)

Defined in: [src/verticals/token.types.ts:102](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L102)

What the account wants (XRP or IOU).
