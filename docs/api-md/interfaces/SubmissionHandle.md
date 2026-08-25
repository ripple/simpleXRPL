# Interface: SubmissionHandle

Defined in: [domain/model.ts:191](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L191)

Handle returned by an async submission, used to poll or wait for a terminal
state without holding the original request open.

## Properties

### cancel()?

> `readonly` `optional` **cancel**: () => `Promise`\<`void`\>

Defined in: [domain/model.ts:208](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L208)

Cancel the pending intent where the backend supports it.

#### Returns

`Promise`\<`void`\>

***

### custodian

> `readonly` **custodian**: [`Custodian`](Custodian.md)

Defined in: [domain/model.ts:199](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L199)

The custodian that produced this handle.

***

### id

> `readonly` **id**: `string`

Defined in: [domain/model.ts:196](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L196)

Custodian-native id (intent id), or the XRPL transaction hash for local.

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:193](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L193)

The custodian kind that owns the underlying intent or transaction.

***

### poll()

> `readonly` **poll**: () => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:202](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L202)

A non-blocking snapshot of the current state.

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

***

### wait()

> `readonly` **wait**: (`timeoutMs`?) => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:205](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L205)

Block until terminal state or the timeout (defaults to the custodian's).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs`? | `number` |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>
