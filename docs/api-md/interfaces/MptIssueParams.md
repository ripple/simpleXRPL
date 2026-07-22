# Interface: MptIssueParams

Defined in: [verticals/token.types.ts:38](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L38)

Parameters for `Token.issue`.

## Properties

### assetScale?

> `readonly` `optional` **assetScale**: `number`

Defined in: [verticals/token.types.ts:40](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L40)

Decimal places between display value and base units.

***

### flags?

> `readonly` `optional` **flags**: [`MptIssueFlags`](MptIssueFlags.md)

Defined in: [verticals/token.types.ts:52](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L52)

Capability flags.

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [verticals/token.types.ts:42](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L42)

Maximum issuable amount, in base units.

***

### metadata

> `readonly` **metadata**: `string` \| `MPTokenMetadata`

Defined in: [verticals/token.types.ts:50](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L50)

Token metadata (required): a structured object (encoded per the XLS-89
standard) or a raw string (UTF-8 hex-encoded as-is). Either way it is
validated against XLS-89; non-adherence is rejected.

***

### transferFee?

> `readonly` `optional` **transferFee**: `number`

Defined in: [verticals/token.types.ts:44](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L44)

Transfer fee on secondary sales, as a percentage (0.5 = 0.5%, 0–50).
