# Function: isNativePath()

> **isNativePath**(`path`): `boolean`

Defined in: [src/pipeline/dispatch.ts:53](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/pipeline/dispatch.ts#L53)

Whether the path submits through the custodian's own network rather than the
shared ledger.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | [`SubmissionPath`](../type-aliases/SubmissionPath.md) | The dispatched submission path. |

## Returns

`boolean`

`true` for the native custody paths.
