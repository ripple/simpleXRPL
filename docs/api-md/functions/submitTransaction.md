# Function: submitTransaction()

> **submitTransaction**(`host`, `request`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [src/pipeline/pipeline.ts:53](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/pipeline/pipeline.ts#L53)

Run a single built transaction through Validate → Dispatch → Resolve →
Sign+submit → Wait. Returns the custodian's transport result; callers attach
the vertical `intent` output via [withIntent](withIntent.md).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client subset the pipeline runs against. |
| `request` | [`SubmitRequest`](../interfaces/SubmitRequest.md) | The transaction, resolved account, and per-call options. |

## Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The submission result.

## Throws

[IntentValidationError](../classes/IntentValidationError.md) if protocol validation fails.

## Throws

[SignerCapabilityError](../classes/SignerCapabilityError.md) if the custodian cannot sign the transactor.
