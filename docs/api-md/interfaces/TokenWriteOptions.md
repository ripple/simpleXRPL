# Interface: TokenWriteOptions

Defined in: [verticals/token.types.ts:7](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L7)

Per-call options shared by the token operations.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/token.types.ts:12](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L12)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/token.types.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L9)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/token.types.ts:18](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L18)

A prior submission's `idempotencyKey` (from its result), to retry to the
same intent instead of creating a duplicate (§8). Auto-generated when omitted.
