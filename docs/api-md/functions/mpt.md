# Function: mpt()

> **mpt**(`mptIssuanceId`, `scale`): [`Asset`](../type-aliases/Asset.md)

Defined in: [src/amount/asset.ts:36](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/amount/asset.ts#L36)

A Multi-Purpose Token (MPT) asset.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `mptIssuanceId` | `string` | `undefined` | The MPT issuance id. |
| `scale` | `number` | `0` | Decimal places between display value and on-ledger base units (e.g. `2` means a display value of `1.25` is `125` base units). Defaults to `0`. |

## Returns

[`Asset`](../type-aliases/Asset.md)

The MPT asset.
