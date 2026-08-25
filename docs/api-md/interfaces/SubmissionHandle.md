# Interface: SubmissionHandle

Defined in: [domain/model.ts:212](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L212)

Handle returned by an async submission, used to poll or wait for a terminal
state without holding the original request open.

## Properties

### cancel()?

> `readonly` `optional` **cancel**: () => `Promise`\<`void`\>

Defined in: [domain/model.ts:229](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L229)

Cancel the pending intent where the backend supports it.

#### Returns

`Promise`\<`void`\>

***

### custodian

> `readonly` **custodian**: [`Custodian`](Custodian.md)

Defined in: [domain/model.ts:220](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L220)

The custodian that produced this handle.

***

### id

> `readonly` **id**: `string`

Defined in: [domain/model.ts:217](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L217)

Custodian-native id (intent id), or the XRPL transaction hash for local.

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:214](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L214)

The custodian kind that owns the underlying intent or transaction.

***

### poll()

> `readonly` **poll**: () => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:223](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L223)

A non-blocking snapshot of the current state.

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

***

### wait()

> `readonly` **wait**: (`timeoutMs`?) => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:226](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L226)

Block until terminal state or the timeout (defaults to the custodian's).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs`? | `number` |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>
