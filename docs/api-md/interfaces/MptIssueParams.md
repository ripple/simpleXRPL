# Interface: MptIssueParams

Defined in: [verticals/token.types.ts:66](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L66)

Parameters for `Token.issue`.

## Properties

### assetScale?

> `readonly` `optional` **assetScale**: `number`

Defined in: [verticals/token.types.ts:72](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L72)

Decimal places between display value and base units.

#### Default Value

`2`

***

### flags?

> `readonly` `optional` **flags**: [`MptIssueFlags`](MptIssueFlags.md)

Defined in: [verticals/token.types.ts:100](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L100)

Capability flags. Any flag omitted (or the whole object omitted) takes the
per-flag SDK default; see [MptIssueFlags](MptIssueFlags.md).

#### Default Value

`{ canLock: true, requireAuth: false, canEscrow: true, canTrade: true, canTransfer: true, canClawback: true }`

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [verticals/token.types.ts:78](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L78)

Maximum issuable amount, in base units.

#### Default Value

Uncapped — the protocol maximum (no `MaximumAmount` is set).

***

### metadata

> `readonly` **metadata**: `string` \| `MPTokenMetadata`

Defined in: [verticals/token.types.ts:93](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L93)

Token metadata (required): a structured object (encoded per the XLS-89
standard) or a raw string (UTF-8 hex-encoded as-is). Either way it is
validated against XLS-89; non-adherence is rejected. There is no default —
the SDK never substitutes placeholder metadata.

#### See

[XLS-89: Multi-Purpose Token Metadata Schema](https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema)

***

### transferFee?

> `readonly` `optional` **transferFee**: `number`

Defined in: [verticals/token.types.ts:84](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L84)

Transfer fee on secondary sales, as a percentage (0.5 = 0.5%, range 0–50).

#### Default Value

`0` — no transfer fee.
