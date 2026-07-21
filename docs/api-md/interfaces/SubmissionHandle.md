# Interface: SubmissionHandle

Defined in: [src/domain/model.ts:160](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L160)

Handle returned by an async submission, used to poll or wait for a terminal
state without holding the original request open.

## Properties

### cancel()?

> `readonly` `optional` **cancel**: () => `Promise`\<`void`\>

Defined in: [src/domain/model.ts:177](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L177)

Cancel the pending intent where the backend supports it.

#### Returns

`Promise`\<`void`\>

***

### custodian

> `readonly` **custodian**: [`Custodian`](Custodian.md)

Defined in: [src/domain/model.ts:168](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L168)

The custodian that produced this handle.

***

### id

> `readonly` **id**: `string`

Defined in: [src/domain/model.ts:165](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L165)

Custodian-native id (intent id), or the XRPL transaction hash for local.

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [src/domain/model.ts:162](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L162)

The custodian kind that owns the underlying intent or transaction.

***

### poll()

> `readonly` **poll**: () => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [src/domain/model.ts:171](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L171)

A non-blocking snapshot of the current state.

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

***

### wait()

> `readonly` **wait**: (`timeoutMs`?) => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [src/domain/model.ts:174](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L174)

Block until terminal state or the timeout (defaults to the custodian's).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs`? | `number` |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>
