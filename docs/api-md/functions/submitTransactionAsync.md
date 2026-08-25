# Function: submitTransactionAsync()

> **submitTransactionAsync**(`host`, `request`): `Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

Defined in: [pipeline/pipeline.ts:84](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/pipeline.ts#L84)

Like [submitTransaction](submitTransaction.md), but returns a [SubmissionHandle](../interfaces/SubmissionHandle.md) as
soon as the custodian accepts the intent instead of blocking to a terminal
state. For a governed custodian the handle observes the pending
intent; for Local it wraps the already-submitted transaction.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client subset the pipeline runs against. |
| `request` | [`SubmitRequest`](../interfaces/SubmitRequest.md) | The transaction, resolved account, and per-call options. |

## Returns

`Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

A handle over the accepted submission.

## Throws

[IntentValidationError](../classes/IntentValidationError.md) if protocol validation fails.

## Throws

[SignerCapabilityError](../classes/SignerCapabilityError.md) if the custodian cannot sign the transactor.
