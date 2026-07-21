# Interface: IOUWriteOptions

Defined in: [src/verticals/iou.types.ts:22](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L22)

Source account and fee overrides shared by the IOU write verbs. The
resolved account is the IOU's issuer — it signs, and its address is the
currency issuer.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/verticals/iou.types.ts:27](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L27)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [src/verticals/iou.types.ts:24](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L24)

Issuer account; defaults to the primary signer's primary account.
