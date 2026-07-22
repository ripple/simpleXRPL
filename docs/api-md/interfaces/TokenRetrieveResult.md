# Interface: TokenRetrieveResult

Defined in: [verticals/token.types.ts:172](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L172)

Result of [Token.retrieve](../classes/Token.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`TokenData`](TokenData.md)

Defined in: [verticals/token.types.ts:176](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L176)

The issuance snapshot, or `undefined` if no such issuance exists.

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:174](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L174)

The queried MPT issuance id.
