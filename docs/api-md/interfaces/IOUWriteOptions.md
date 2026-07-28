# Interface: IOUWriteOptions

Defined in: [verticals/iou.types.ts:22](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L22)

Source account and fee overrides shared by the IOU write verbs. The
resolved account is the IOU's issuer — it signs, and its address is the
currency issuer.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/iou.types.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L27)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/iou.types.ts:24](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L24)

Issuer account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/iou.types.ts:33](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L33)

A prior submission's `idempotencyKey` (from its result), to retry to the
same intent instead of creating a duplicate (§8). Auto-generated when omitted.
