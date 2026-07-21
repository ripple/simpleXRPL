# Function: iou()

> **iou**(`currency`, `issuer`): [`Asset`](../type-aliases/Asset.md)

Defined in: [src/amount/asset.ts:24](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/amount/asset.ts#L24)

An issued-currency (IOU) asset.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `currency` | `string` | The currency code (3-char code or 40-char hex). |
| `issuer` | `string` | The issuer's r-address. |

## Returns

[`Asset`](../type-aliases/Asset.md)

The IOU asset.
