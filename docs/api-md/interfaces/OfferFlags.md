# Interface: OfferFlags

Defined in: [src/verticals/token.types.ts:86](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L86)

Flags for `Token.createOffer`.

## Properties

### fillOrKill?

> `readonly` `optional` **fillOrKill**: `boolean`

Defined in: [src/verticals/token.types.ts:92](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L92)

Consume the full amount or cancel entirely.

***

### immediateOrCancel?

> `readonly` `optional` **immediateOrCancel**: `boolean`

Defined in: [src/verticals/token.types.ts:90](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L90)

Consume matching offers immediately; never place the remainder.

***

### passive?

> `readonly` `optional` **passive**: `boolean`

Defined in: [src/verticals/token.types.ts:88](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L88)

Do not consume offers that exactly match.

***

### sell?

> `readonly` `optional` **sell**: `boolean`

Defined in: [src/verticals/token.types.ts:94](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L94)

Interpret the offer as selling `TakerGets`.
