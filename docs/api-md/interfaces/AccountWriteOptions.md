# Interface: AccountWriteOptions

Defined in: [src/verticals/account.types.ts:34](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L34)

Per-call options shared by the account verbs.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/verticals/account.types.ts:39](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L39)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [src/verticals/account.types.ts:36](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L36)

Source account; defaults to the primary signer's primary account.
