# Interface: AccountWriteOptions

Defined in: [verticals/account.types.ts:39](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L39)

Per-call options shared by the account operations.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/account.types.ts:44](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L44)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/account.types.ts:41](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L41)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/account.types.ts:52](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L52)

A prior submission's `idempotencyKey` (from its result) so a retry resolves
to the same submission instead of duplicating it. How completely this
de-duplicates is set by the backend — see the note on the result's
`idempotencyKey`. Auto-generated when omitted.
