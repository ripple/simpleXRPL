# Interface: OfferFlags

Defined in: [verticals/token.types.ts:92](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L92)

Flags for `Token.createOffer`.

## Properties

### fillOrKill?

> `readonly` `optional` **fillOrKill**: `boolean`

Defined in: [verticals/token.types.ts:98](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L98)

Consume the full amount or cancel entirely.

***

### immediateOrCancel?

> `readonly` `optional` **immediateOrCancel**: `boolean`

Defined in: [verticals/token.types.ts:96](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L96)

Consume matching offers immediately; never place the remainder.

***

### passive?

> `readonly` `optional` **passive**: `boolean`

Defined in: [verticals/token.types.ts:94](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L94)

Do not consume offers that exactly match.

***

### sell?

> `readonly` `optional` **sell**: `boolean`

Defined in: [verticals/token.types.ts:100](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L100)

Interpret the offer as selling `TakerGets`.
