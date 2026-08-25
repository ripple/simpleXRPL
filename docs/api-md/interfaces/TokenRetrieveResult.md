# Interface: TokenRetrieveResult

Defined in: [verticals/token.types.ts:198](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L198)

Result of [Token.retrieve](../classes/Token.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`TokenData`](TokenData.md)

Defined in: [verticals/token.types.ts:202](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L202)

The issuance snapshot, or `undefined` if no such issuance exists.

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:200](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L200)

The queried MPT issuance id.
