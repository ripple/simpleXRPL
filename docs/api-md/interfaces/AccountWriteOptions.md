# Interface: AccountWriteOptions

Defined in: [src/verticals/account.types.ts:34](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L34)

Per-call options shared by the account verbs.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/verticals/account.types.ts:39](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L39)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [src/verticals/account.types.ts:36](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L36)

Source account; defaults to the primary signer's primary account.
