# Interface: TokenLockParams

Defined in: [verticals/token.types.ts:120](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L120)

Parameters for `Token.lock` / `Token.unlock`.

## Properties

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [verticals/token.types.ts:124](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L124)

A specific holder to (un)lock; omit to affect the whole issuance.

***

### mptIssuanceId

> `readonly` **mptIssuanceId**: `string`

Defined in: [verticals/token.types.ts:122](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L122)

The MPT issuance id.
