# Interface: CreateOfferParams

Defined in: [verticals/token.types.ts:104](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L104)

Parameters for `Token.createOffer`.

## Properties

### expiration?

> `readonly` `optional` **expiration**: `number`

Defined in: [verticals/token.types.ts:110](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L110)

Offer expiration (seconds since the Ripple epoch).

***

### flags?

> `readonly` `optional` **flags**: [`OfferFlags`](OfferFlags.md)

Defined in: [verticals/token.types.ts:114](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L114)

Offer flags.

***

### offerSequence?

> `readonly` `optional` **offerSequence**: `number`

Defined in: [verticals/token.types.ts:112](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L112)

A prior offer sequence to replace.

***

### takerGets

> `readonly` **takerGets**: [`Amount`](Amount.md)

Defined in: [verticals/token.types.ts:106](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L106)

What the account gives (XRP or IOU — MPT is not DEX-tradeable).

***

### takerPays

> `readonly` **takerPays**: [`Amount`](Amount.md)

Defined in: [verticals/token.types.ts:108](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L108)

What the account wants (XRP or IOU).
