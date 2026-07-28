# Interface: SubmissionHandle

Defined in: [domain/model.ts:171](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L171)

Handle returned by an async submission, used to poll or wait for a terminal
state without holding the original request open.

## Properties

### cancel()?

> `readonly` `optional` **cancel**: () => `Promise`\<`void`\>

Defined in: [domain/model.ts:188](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L188)

Cancel the pending intent where the backend supports it.

#### Returns

`Promise`\<`void`\>

***

### custodian

> `readonly` **custodian**: [`Custodian`](Custodian.md)

Defined in: [domain/model.ts:179](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L179)

The custodian that produced this handle.

***

### id

> `readonly` **id**: `string`

Defined in: [domain/model.ts:176](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L176)

Custodian-native id (intent id), or the XRPL transaction hash for local.

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:173](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L173)

The custodian kind that owns the underlying intent or transaction.

***

### poll()

> `readonly` **poll**: () => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:182](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L182)

A non-blocking snapshot of the current state.

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

***

### wait()

> `readonly` **wait**: (`timeoutMs`?) => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:185](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L185)

Block until terminal state or the timeout (defaults to the custodian's).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs`? | `number` |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>
