# Interface: TokenIssueParams

Defined in: [verticals/token.types.ts:68](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L68)

Parameters for `Token.issue`.

## Properties

### assetScale?

> `readonly` `optional` **assetScale**: `number`

Defined in: [verticals/token.types.ts:74](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L74)

Decimal places between display value and base units.

#### Default Value

`2`

***

### flags?

> `readonly` `optional` **flags**: [`TokenIssueFlags`](TokenIssueFlags.md)

Defined in: [verticals/token.types.ts:102](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L102)

Capability flags. Any flag omitted (or the whole object omitted) takes the
per-flag SDK default; see [TokenIssueFlags](TokenIssueFlags.md).

#### Default Value

`{ canLock: true, requireAuth: false, canEscrow: true, canTrade: true, canTransfer: true, canClawback: true }`

***

### maximumAmount?

> `readonly` `optional` **maximumAmount**: `string`

Defined in: [verticals/token.types.ts:80](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L80)

Maximum issuable amount, in base units.

#### Default Value

Uncapped — the protocol maximum (no `MaximumAmount` is set).

***

### metadata

> `readonly` **metadata**: `string` \| `MPTokenMetadata`

Defined in: [verticals/token.types.ts:95](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L95)

Token metadata (required): a structured object (encoded per the XLS-89
standard) or a raw string (UTF-8 hex-encoded as-is). Either way it is
validated against XLS-89; non-adherence is rejected. There is no default —
the SDK never substitutes placeholder metadata.

#### See

[XLS-89: Multi-Purpose Token Metadata Schema](https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema)

***

### transferFee?

> `readonly` `optional` **transferFee**: `number`

Defined in: [verticals/token.types.ts:86](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L86)

Transfer fee on secondary sales, as a percentage (0.5 = 0.5%, range 0–50).

#### Default Value

`0` — no transfer fee.
