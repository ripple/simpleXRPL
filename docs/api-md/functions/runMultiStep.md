# Function: runMultiStep()

> **runMultiStep**(`host`, `steps`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)[]\>

Defined in: [orchestration/multi-step.ts:39](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/orchestration/multi-step.ts#L39)

Run an ordered sequence of steps, committing each one before starting the
next. Each step runs through the single-step pipeline
([submitTransaction](submitTransaction.md) — Validate → Dispatch → Resolve → Sign+submit),
so multi-step verbs get the same protocol validation and dispatch rules as
any single-step verb, with no orchestrator-specific custodian logic.

There is no rollback: if a step fails, every prior step has already
committed on-ledger/on-custodian. The caller reconciles manually, typically
by re-running just the failed step via its matching single-step verb.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client subset the pipeline runs against. |
| `steps` | readonly [`SubmitRequest`](../interfaces/SubmitRequest.md)[] | The ordered submission requests to run. |

## Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)[]\>

The results of every step, in order.

## Throws

[MultiStepFailureError](../classes/MultiStepFailureError.md) if any step fails, carrying the
already-committed results and the failed step's index and error.
