# Interface: CredentialWriteOptions

Defined in: [verticals/credential.types.ts:4](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L4)

Per-call options shared by the credential verbs.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/credential.types.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L9)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/credential.types.ts:6](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L6)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/credential.types.ts:15](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L15)

A prior submission's `idempotencyKey` (from its result), to retry to the
same intent instead of creating a duplicate (§8). Auto-generated when omitted.
