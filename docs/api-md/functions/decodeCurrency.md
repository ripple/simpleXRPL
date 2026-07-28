# Function: decodeCurrency()

> **decodeCurrency**(`code`): `string`

Defined in: [reads/read-helpers.ts:45](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/reads/read-helpers.ts#L45)

Decode an XRPL currency code to a human ticker: a 3-character ISO code is
returned as-is; a 40-character hex code is decoded to ASCII when printable,
else returned unchanged.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `code` | `string` | The currency code from the ledger (ISO or hex). |

## Returns

`string`

The human-readable ticker.
