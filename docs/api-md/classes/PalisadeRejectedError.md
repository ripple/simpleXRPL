# Class: PalisadeRejectedError

Defined in: [errors.ts:213](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L213)

A Palisade transaction reached a terminal governance-layer failure — the
approval was `REJECTED`, or Palisade marked it `FAILED` — before it ever
reached the ledger. Distinct from [XrpldSubmitError](XrpldSubmitError.md) (an on-ledger
engine failure) and [IntentPendingError](IntentPendingError.md) (still in flight): this
transaction is dead and will not apply. The `status` and any `attributes`
Palisade attached are preserved, since the transaction may not be readable
again without credentials the caller lacks.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new PalisadeRejectedError()

> **new PalisadeRejectedError**(`transactionId`, `status`, `details`?): [`PalisadeRejectedError`](PalisadeRejectedError.md)

Defined in: [errors.ts:228](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L228)

Construct a PalisadeRejectedError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transactionId` | `string` | The Palisade transaction id. |
| `status` | `string` | The terminal status (`REJECTED` or `FAILED`). |
| `details`? | \{ `action`: `string`; `attributes`: `Readonly`\<`Record`\<`string`, `unknown`\>\>; \} | The transaction's action and attributes, for diagnosis. |
| `details.action`? | `string` | The Palisade action, when present. |
| `details.attributes`? | `Readonly`\<`Record`\<`string`, `unknown`\>\> | Palisade-attached attributes, when present. |

#### Returns

[`PalisadeRejectedError`](PalisadeRejectedError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### action?

> `readonly` `optional` **action**: `string`

Defined in: [errors.ts:216](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L216)

***

### attributes

> `readonly` **attributes**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [errors.ts:217](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L217)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### status

> `readonly` **status**: `string`

Defined in: [errors.ts:215](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L215)

***

### transactionId

> `readonly` **transactionId**: `string`

Defined in: [errors.ts:214](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L214)
