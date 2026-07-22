# Interface: TokenListResult

Defined in: [verticals/token.types.ts:198](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L198)

Result of [Token.list](../classes/Token.md#list): `tokens[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`TokenListEntry`](TokenListEntry.md)[]

Defined in: [verticals/token.types.ts:202](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L202)

The shaped entries.

***

### tokens

> `readonly` **tokens**: readonly `string`[]

Defined in: [verticals/token.types.ts:200](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L200)

The MPT issuance id of each token.
