# Interface: XrpTransferOptions

Defined in: [verticals/xrp.ts:22](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/xrp.ts#L22)

Per-call options for [XRP.transfer](../classes/XRP.md#transfer).

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/xrp.ts:27](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/xrp.ts#L27)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/xrp.ts:24](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/xrp.ts#L24)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/xrp.ts:33](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/xrp.ts#L33)

A prior submission's `idempotencyKey` (from its result), to retry to the
same intent instead of creating a duplicate (§8). Auto-generated when omitted.
