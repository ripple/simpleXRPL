# Interface: MptLockParams

Defined in: [verticals/token.types.ts:70](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L70)

Parameters for `Token.lock` / `Token.unlock`.

## Properties

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [verticals/token.types.ts:74](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L74)

A specific holder to (un)lock; omit to affect the whole issuance.

***

### mptIssuanceId

> `readonly` **mptIssuanceId**: `string`

Defined in: [verticals/token.types.ts:72](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L72)

The MPT issuance id.
