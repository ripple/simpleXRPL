# Function: submitTransaction()

> **submitTransaction**(`host`, `request`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [src/pipeline/pipeline.ts:53](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/pipeline/pipeline.ts#L53)

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
