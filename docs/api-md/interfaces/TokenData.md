# Interface: TokenData

Defined in: [verticals/token.types.ts:170](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L170)

A shaped MPT issuance (from `ledger_entry`).

## Properties

### assetScale

> `readonly` **assetScale**: `number`

Defined in: [verticals/token.types.ts:176](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L176)

Decimal places between display value and base units.

***

### flags

> `readonly` **flags**: [`TokenFlags`](TokenFlags.md)

Defined in: [verticals/token.types.ts:184](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L184)

Capability flags.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/token.types.ts:174](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L174)

The issuer r-address.

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [verticals/token.types.ts:178](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L178)

Maximum issuable amount (base units), if capped.

***

### metadata?

> `readonly` `optional` **metadata**: `MPTokenMetadata`

Defined in: [verticals/token.types.ts:186](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L186)

Decoded XLS-89 metadata, if present and well-formed.

***

### outstandingAmount

> `readonly` **outstandingAmount**: `string`

Defined in: [verticals/token.types.ts:180](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L180)

Amount currently in circulation (base units).

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:172](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L172)

The MPT issuance id.

***

### transferFee

> `readonly` **transferFee**: `number`

Defined in: [verticals/token.types.ts:182](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L182)

Secondary-transfer fee, as a percentage.
