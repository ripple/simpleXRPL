# Interface: TokenListResult

Defined in: [verticals/token.types.ts:275](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L275)

Result of [Token.list](../classes/Token.md#list): `tokens[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`TokenListEntry`](TokenListEntry.md)[]

Defined in: [verticals/token.types.ts:279](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L279)

The shaped entries.

***

### tokens

> `readonly` **tokens**: readonly `string`[]

Defined in: [verticals/token.types.ts:277](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L277)

The MPT issuance id of each token.
