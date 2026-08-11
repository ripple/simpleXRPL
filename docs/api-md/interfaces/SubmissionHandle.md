# Interface: SubmissionHandle

Defined in: [domain/model.ts:181](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L181)

Handle returned by an async submission, used to poll or wait for a terminal
state without holding the original request open.

## Properties

### cancel()?

> `readonly` `optional` **cancel**: () => `Promise`\<`void`\>

Defined in: [domain/model.ts:198](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L198)

Cancel the pending intent where the backend supports it.

#### Returns

`Promise`\<`void`\>

***

### custodian

> `readonly` **custodian**: [`Custodian`](Custodian.md)

Defined in: [domain/model.ts:189](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L189)

The custodian that produced this handle.

***

### id

> `readonly` **id**: `string`

Defined in: [domain/model.ts:186](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L186)

Custodian-native id (intent id), or the XRPL transaction hash for local.

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:183](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L183)

The custodian kind that owns the underlying intent or transaction.

***

### poll()

> `readonly` **poll**: () => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:192](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L192)

A non-blocking snapshot of the current state.

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

***

### wait()

> `readonly` **wait**: (`timeoutMs`?) => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:195](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L195)

Block until terminal state or the timeout (defaults to the custodian's).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs`? | `number` |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>
