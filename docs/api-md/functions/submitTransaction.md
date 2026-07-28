# Function: submitTransaction()

> **submitTransaction**(`host`, `request`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [pipeline/pipeline.ts:63](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/pipeline/pipeline.ts#L63)

Run a single built transaction through Validate → Dispatch → Resolve →
Sign+submit → Wait. Returns the custodian's transport result; callers attach
the vertical `intent` output via [withIntent](withIntent.md).

A stable idempotency id is generated here (a time-ordered UUIDv7) unless the
caller supplied one, so it is fixed before the intent is created, surfaced on
the result, and reused verbatim on a retry (§8) — resolving to the same
intent instead of a duplicate.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client subset the pipeline runs against. |
| `request` | [`SubmitRequest`](../interfaces/SubmitRequest.md) | The transaction, resolved account, and per-call options. |

## Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The submission result, carrying the `idempotencyKey` used.

## Throws

[IntentValidationError](../classes/IntentValidationError.md) if protocol validation fails.

## Throws

[SignerCapabilityError](../classes/SignerCapabilityError.md) if the custodian cannot sign the transactor.
