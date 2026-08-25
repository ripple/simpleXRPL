# Class: MultiStepFailureError

Defined in: [errors.ts:309](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L309)

A multi-step operation failed partway through. simpleXRPL does not roll back; the
already-committed steps are carried so the caller can reconcile manually.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new MultiStepFailureError()

> **new MultiStepFailureError**(`committed`, `failed`): [`MultiStepFailureError`](MultiStepFailureError.md)

Defined in: [errors.ts:324](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L324)

Construct a MultiStepFailureError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `committed` | readonly [`SubmissionResult`](../type-aliases/SubmissionResult.md)[] | Sub-transactions that succeeded before the failure. |
| `failed` | \{ `error`: [`SimpleXRPLError`](SimpleXRPLError.md); `step`: `number`; \} | The step that failed. |
| `failed.error` | [`SimpleXRPLError`](SimpleXRPLError.md) | The error that the failed step threw. |
| `failed.step` | `number` | The zero-based index of the failed step. |

#### Returns

[`MultiStepFailureError`](MultiStepFailureError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### committed

> `readonly` **committed**: readonly [`SubmissionResult`](../type-aliases/SubmissionResult.md)[]

Defined in: [errors.ts:310](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L310)

***

### failed

> `readonly` **failed**: \{ `error`: [`SimpleXRPLError`](SimpleXRPLError.md); `step`: `number`; \}

Defined in: [errors.ts:311](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L311)

#### error

> `readonly` **error**: [`SimpleXRPLError`](SimpleXRPLError.md)

#### step

> `readonly` **step**: `number`

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
