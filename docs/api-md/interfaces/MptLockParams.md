# Interface: MptLockParams

Defined in: [verticals/token.types.ts:118](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L118)

Parameters for `Token.lock` / `Token.unlock`.

## Properties

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [verticals/token.types.ts:122](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L122)

A specific holder to (un)lock; omit to affect the whole issuance.

***

### mptIssuanceId

> `readonly` **mptIssuanceId**: `string`

Defined in: [verticals/token.types.ts:120](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L120)

The MPT issuance id.
