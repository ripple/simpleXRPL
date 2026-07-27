# Interface: CreateOfferParams

Defined in: [verticals/token.types.ts:169](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L169)

Parameters for `Token.createOffer`.

## Properties

### expiration?

> `readonly` `optional` **expiration**: `number`

Defined in: [verticals/token.types.ts:175](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L175)

Offer expiration (seconds since the Ripple epoch).

***

### flags?

> `readonly` `optional` **flags**: [`OfferFlags`](OfferFlags.md)

Defined in: [verticals/token.types.ts:183](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L183)

Offer flags. Omit for a plain resting limit offer.

#### Default Value

No flags set — see [OfferFlags](OfferFlags.md) (all `false`).

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [verticals/token.types.ts:177](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L177)

A prior offer sequence to replace.

***

### takerGets

> `readonly` **takerGets**: [`Amount`](Amount.md)

Defined in: [verticals/token.types.ts:171](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L171)

What the account gives (XRP or IOU — MPT is not DEX-tradeable).

***

### takerPays

> `readonly` **takerPays**: [`Amount`](Amount.md)

Defined in: [verticals/token.types.ts:173](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L173)

What the account wants (XRP or IOU).
