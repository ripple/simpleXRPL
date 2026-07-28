# Function: isNativePath()

> **isNativePath**(`path`): `boolean`

Defined in: [pipeline/dispatch.ts:59](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/pipeline/dispatch.ts#L59)

Whether the path submits through the custodian's own network rather than the
shared ledger.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | [`SubmissionPath`](../type-aliases/SubmissionPath.md) | The dispatched submission path. |

## Returns

`boolean`

`true` for the native custody paths.
