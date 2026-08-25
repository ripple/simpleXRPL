# Interface: DomainWriteOptions

Defined in: [verticals/domain.types.ts:4](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L4)

Per-call options shared by the domain operations.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/domain.types.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L9)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/domain.types.ts:6](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L6)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/domain.types.ts:17](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L17)

A prior submission's `idempotencyKey` (from its result) so a retry resolves
to the same submission instead of duplicating it. How completely this
de-duplicates is set by the backend — see the note on the result's
`idempotencyKey`. Auto-generated when omitted.
