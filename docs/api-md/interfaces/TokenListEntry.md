# Interface: TokenListEntry

Defined in: [verticals/token.types.ts:180](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L180)

An entry in [Token.list](../classes/Token.md#list): a full issuance (issuer) or a holding.

## Properties

### balance?

> `readonly` `optional` **balance**: `string`

Defined in: [verticals/token.types.ts:184](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L184)

The account's balance (present for `role: 'holder'`).

***

### issuance?

> `readonly` `optional` **issuance**: [`TokenData`](TokenData.md)

Defined in: [verticals/token.types.ts:186](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L186)

The full issuance snapshot (present for `role: 'issuer'`).

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:182](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L182)

The MPT issuance id.
