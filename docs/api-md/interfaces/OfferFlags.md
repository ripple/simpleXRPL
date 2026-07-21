# Interface: OfferFlags

Defined in: [src/verticals/token.types.ts:86](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/token.types.ts#L86)

Flags for `Token.createOffer`.

## Properties

### fillOrKill?

> `readonly` `optional` **fillOrKill**: `boolean`

Defined in: [src/verticals/token.types.ts:92](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/token.types.ts#L92)

Consume the full amount or cancel entirely.

***

### immediateOrCancel?

> `readonly` `optional` **immediateOrCancel**: `boolean`

Defined in: [src/verticals/token.types.ts:90](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/token.types.ts#L90)

Consume matching offers immediately; never place the remainder.

***

### passive?

> `readonly` `optional` **passive**: `boolean`

Defined in: [src/verticals/token.types.ts:88](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/token.types.ts#L88)

Do not consume offers that exactly match.

***

### sell?

> `readonly` `optional` **sell**: `boolean`

Defined in: [src/verticals/token.types.ts:94](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/token.types.ts#L94)

Interpret the offer as selling `TakerGets`.
