# Interface: MptLockParams

Defined in: [src/verticals/token.types.ts:64](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L64)

Parameters for `Token.lock` / `Token.unlock`.

## Properties

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [src/verticals/token.types.ts:68](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L68)

A specific holder to (un)lock; omit to affect the whole issuance.

***

### mptIssuanceId

> `readonly` **mptIssuanceId**: `string`

Defined in: [src/verticals/token.types.ts:66](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L66)

The MPT issuance id.
