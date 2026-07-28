# Function: iou()

> **iou**(`currency`, `issuer`): [`Asset`](../type-aliases/Asset.md)

Defined in: [amount/asset.ts:24](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/amount/asset.ts#L24)

An issued-currency (IOU) asset.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `currency` | `string` | The currency code (3-char code or 40-char hex). |
| `issuer` | `string` | The issuer's r-address. |

## Returns

[`Asset`](../type-aliases/Asset.md)

The IOU asset.
