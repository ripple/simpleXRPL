# Type Alias: SubmissionResult\<T\>

> **SubmissionResult**\<`T`\>: [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: `TxResponse`; `source`: `"xrpld"`; \} \| [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: [`CustodyTransactionResult`](CustodyTransactionResult.md); `source`: `"custody"`; \} \| [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: [`PalisadeTransactionResult`](PalisadeTransactionResult.md); `source`: `"palisade"`; \}

Defined in: [domain/model.ts:163](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L163)

The discriminated-union result every write resolves to, tagged by `source`
with the backend-specific response preserved verbatim.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
