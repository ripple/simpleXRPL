# Interface: AccountCredentials

Defined in: [src/verticals/account.types.ts:8](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L8)

The locally-generated credentials returned by `Account.create`. Nothing is
written to the ledger; `seed` is the only way to control the account and must
be stored securely.

## Properties

### address

> `readonly` **address**: `string`

Defined in: [src/verticals/account.types.ts:10](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L10)

The classic r-address.

***

### privateKey

> `readonly` **privateKey**: `string`

Defined in: [src/verticals/account.types.ts:14](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L14)

The private key (hex) — sensitive.

***

### publicKey

> `readonly` **publicKey**: `string`

Defined in: [src/verticals/account.types.ts:12](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L12)

The public key (hex).

***

### seed

> `readonly` **seed**: `string`

Defined in: [src/verticals/account.types.ts:16](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L16)

The account seed (secret) — sensitive.
