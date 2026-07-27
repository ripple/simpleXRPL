# Function: mpt()

> **mpt**(`mptIssuanceId`, `scale`): [`Asset`](../type-aliases/Asset.md)

Defined in: [amount/asset.ts:36](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/amount/asset.ts#L36)

A Multi-Purpose Token (MPT) asset.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `mptIssuanceId` | `string` | `undefined` | The MPT issuance id. |
| `scale` | `number` | `0` | Decimal places between display value and on-ledger base units (e.g. `2` means a display value of `1.25` is `125` base units). Defaults to `0`. |

## Returns

[`Asset`](../type-aliases/Asset.md)

The MPT asset.
