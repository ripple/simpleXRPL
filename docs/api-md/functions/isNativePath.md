# Function: isNativePath()

> **isNativePath**(`path`): `boolean`

Defined in: [src/pipeline/dispatch.ts:53](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/dispatch.ts#L53)

Whether the path submits through the custodian's own network rather than the
shared ledger.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | [`SubmissionPath`](../type-aliases/SubmissionPath.md) | The dispatched submission path. |

## Returns

`boolean`

`true` for the native custody paths.
