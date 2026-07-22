# Function: iou()

> **iou**(`currency`, `issuer`): [`Asset`](../type-aliases/Asset.md)

Defined in: [amount/asset.ts:24](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/amount/asset.ts#L24)

An issued-currency (IOU) asset.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `currency` | `string` | The currency code (3-char code or 40-char hex). |
| `issuer` | `string` | The issuer's r-address. |

## Returns

[`Asset`](../type-aliases/Asset.md)

The IOU asset.
