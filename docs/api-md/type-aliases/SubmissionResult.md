# Type Alias: SubmissionResult\<T\>

> **SubmissionResult**\<`T`\>: [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: `TxResponse`; `source`: `"rippled"`; \} \| [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: [`CustodyTransactionResult`](CustodyTransactionResult.md); `source`: `"custody"`; \} \| [`SubmissionResultFields`](../interfaces/SubmissionResultFields.md)\<`T`\> & \{ `response`: [`PalisadeTransactionResult`](PalisadeTransactionResult.md); `source`: `"palisade"`; \}

Defined in: [src/domain/model.ts:142](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/domain/model.ts#L142)

The discriminated-union result every write resolves to, tagged by `source`
with the backend-specific response preserved verbatim.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
