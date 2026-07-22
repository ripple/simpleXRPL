# Type Alias: SubmissionResult\<T\>

> **SubmissionResult**\<`T`\>: [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: `TxResponse`; `source`: `"rippled"`; \} \| [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: [`CustodyTransactionResult`](CustodyTransactionResult.md); `source`: `"custody"`; \} \| [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: [`PalisadeTransactionResult`](PalisadeTransactionResult.md); `source`: `"palisade"`; \}

Defined in: [domain/model.ts:153](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/domain/model.ts#L153)

The discriminated-union result every write resolves to, tagged by `source`
with the backend-specific response preserved verbatim.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
