# Interface: OfferFlags

Defined in: [verticals/token.types.ts:141](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L141)

Flags for `Token.createOffer`. Every flag defaults to `false` (a plain,
resting limit offer that buys `TakerPays` with `TakerGets`).

## Properties

### fillOrKill?

> `readonly` `optional` **fillOrKill**: `boolean`

Defined in: [verticals/token.types.ts:159](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L159)

Consume the full amount or cancel entirely.

#### Default Value

`false`

***

### immediateOrCancel?

> `readonly` `optional` **immediateOrCancel**: `boolean`

Defined in: [verticals/token.types.ts:153](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L153)

Consume matching offers immediately; never place the remainder.

#### Default Value

`false`

***

### passive?

> `readonly` `optional` **passive**: `boolean`

Defined in: [verticals/token.types.ts:147](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L147)

Do not consume offers that exactly match.

#### Default Value

`false`

***

### sell?

> `readonly` `optional` **sell**: `boolean`

Defined in: [verticals/token.types.ts:165](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L165)

Interpret the offer as selling `TakerGets`.

#### Default Value

`false`
