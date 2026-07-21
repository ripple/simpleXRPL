# Function: withIntent()

> **withIntent**\<`T`\>(`result`, `intent`): [`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`T`\>

Defined in: [src/pipeline/wrap.ts:11](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/pipeline/wrap.ts#L11)

Attach a vertical's typed `intent` output to a custodian's transport result,
preserving the discriminated `source`/`response` pairing.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `result` | [`SubmissionResult`](../type-aliases/SubmissionResult.md) | The custodian's submission result. |
| `intent` | `T` | The vertical-specific output to attach. |

## Returns

[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`T`\>

The result carrying the typed intent.
