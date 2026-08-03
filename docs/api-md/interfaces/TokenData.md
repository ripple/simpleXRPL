# Interface: TokenData

Defined in: [verticals/token.types.ts:215](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L215)

A shaped MPT issuance (from `ledger_entry`).

## Properties

### assetScale

> `readonly` **assetScale**: `number`

Defined in: [verticals/token.types.ts:221](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L221)

Decimal places between display value and base units.

***

### flags

> `readonly` **flags**: [`MptFlags`](MptFlags.md)

Defined in: [verticals/token.types.ts:229](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L229)

Capability flags.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/token.types.ts:219](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L219)

The issuer r-address.

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [verticals/token.types.ts:223](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L223)

Maximum issuable amount (base units), if capped.

***

### metadata?

> `readonly` `optional` **metadata**: `MPTokenMetadata`

Defined in: [verticals/token.types.ts:231](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L231)

Decoded XLS-89 metadata, if present and well-formed.

***

### outstandingAmount

> `readonly` **outstandingAmount**: `string`

Defined in: [verticals/token.types.ts:225](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L225)

Amount currently in circulation (base units).

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:217](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L217)

The MPT issuance id.

***

### transferFee

> `readonly` **transferFee**: `number`

Defined in: [verticals/token.types.ts:227](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L227)

Secondary-transfer fee, as a percentage.
