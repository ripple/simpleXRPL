# Interface: TokenData

Defined in: [verticals/token.types.ts:146](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L146)

A shaped MPT issuance (from `ledger_entry`).

## Properties

### assetScale

> `readonly` **assetScale**: `number`

Defined in: [verticals/token.types.ts:152](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L152)

Decimal places between display value and base units.

***

### flags

> `readonly` **flags**: [`MptFlags`](MptFlags.md)

Defined in: [verticals/token.types.ts:160](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L160)

Capability flags.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/token.types.ts:150](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L150)

The issuer r-address.

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [verticals/token.types.ts:154](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L154)

Maximum issuable amount (base units), if capped.

***

### metadata?

> `readonly` `optional` **metadata**: `MPTokenMetadata`

Defined in: [verticals/token.types.ts:162](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L162)

Decoded XLS-89 metadata, if present and well-formed.

***

### outstandingAmount

> `readonly` **outstandingAmount**: `string`

Defined in: [verticals/token.types.ts:156](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L156)

Amount currently in circulation (base units).

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:148](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L148)

The MPT issuance id.

***

### transferFee

> `readonly` **transferFee**: `number`

Defined in: [verticals/token.types.ts:158](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L158)

Secondary-transfer fee, as a percentage.
