# Interface: MptIssueParams

Defined in: [src/verticals/token.types.ts:32](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L32)

Parameters for `Token.issue`.

## Properties

### assetScale?

> `readonly` `optional` **assetScale**: `number`

Defined in: [src/verticals/token.types.ts:34](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L34)

Decimal places between display value and base units.

***

### flags?

> `readonly` `optional` **flags**: [`MptIssueFlags`](MptIssueFlags.md)

Defined in: [src/verticals/token.types.ts:46](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L46)

Capability flags.

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [src/verticals/token.types.ts:36](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L36)

Maximum issuable amount, in base units.

***

### metadata

> `readonly` **metadata**: `string` \| `MPTokenMetadata`

Defined in: [src/verticals/token.types.ts:44](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L44)

Token metadata (required): a structured object (encoded per the XLS-89
standard) or a raw string (UTF-8 hex-encoded as-is). Either way it is
validated against XLS-89; non-adherence is rejected.

***

### transferFee?

> `readonly` `optional` **transferFee**: `number`

Defined in: [src/verticals/token.types.ts:38](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/token.types.ts#L38)

Transfer fee on secondary sales, as a percentage (0.5 = 0.5%, 0–50).
