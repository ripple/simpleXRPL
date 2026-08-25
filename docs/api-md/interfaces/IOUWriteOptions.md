# Interface: IOUWriteOptions

Defined in: [verticals/iou.types.ts:22](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L22)

Source account and fee overrides shared by the IOU write operations. The
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

Defined in: [verticals/iou.types.ts:35](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L35)

A prior submission's `idempotencyKey` (from its result) so a retry resolves
to the same submission instead of duplicating it. How completely this
de-duplicates is set by the backend — see the note on the result's
`idempotencyKey`. Auto-generated when omitted.
