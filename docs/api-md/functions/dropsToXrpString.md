# Function: dropsToXrpString()

> **dropsToXrpString**(`drops`): `string`

Defined in: [reads/read-helpers.ts:75](https://github.com/ripple/simpleXRPL/blob/main/src/reads/read-helpers.ts#L75)

Convert a drops string to a decimal XRP string, exactly.

Deliberately not `String(dropsToXrp(drops))`: xrpl's `dropsToXrp` returns
a JS `number`, so balances above 2^53 drops (~9.007e9 XRP) lose precision
*silently* — `50000000000000001` drops would read back as `50000000000` XRP,
dropping a whole drop with no error. Balances at that scale are real
(treasury and escrow accounts), and this feeds the values callers reconcile
against, so the shift is done in decimal instead.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `drops` | `string` | The amount in drops (an integer string). |

## Returns

`string`

The exact amount in XRP.
