# Interface: TokenListResult

Defined in: [verticals/token.types.ts:230](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L230)

Result of [Token.list](../classes/Token.md#list): `tokens[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`TokenListEntry`](TokenListEntry.md)[]

Defined in: [verticals/token.types.ts:234](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L234)

The shaped entries.

***

### tokens

> `readonly` **tokens**: readonly `string`[]

Defined in: [verticals/token.types.ts:232](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L232)

The MPT issuance id of each token.
