# Interface: TokenListResult

Defined in: [verticals/token.types.ts:232](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L232)

Result of [Token.list](../classes/Token.md#list): `tokens[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`TokenListEntry`](TokenListEntry.md)[]

Defined in: [verticals/token.types.ts:236](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L236)

The shaped entries.

***

### tokens

> `readonly` **tokens**: readonly `string`[]

Defined in: [verticals/token.types.ts:234](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L234)

The MPT issuance id of each token.
