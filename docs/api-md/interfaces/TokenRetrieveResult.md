# Interface: TokenRetrieveResult

Defined in: [verticals/token.types.ts:241](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L241)

Result of [Token.retrieve](../classes/Token.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`TokenData`](TokenData.md)

Defined in: [verticals/token.types.ts:245](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L245)

The issuance snapshot, or `undefined` if no such issuance exists.

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:243](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L243)

The queried MPT issuance id.
