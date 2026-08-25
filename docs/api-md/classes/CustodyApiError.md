# Class: CustodyApiError

Defined in: [errors.ts:154](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L154)

A Ripple Custody API call returned an error. The diagnostic `hint` and full
response body are preserved for the caller to surface.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new CustodyApiError()

> **new CustodyApiError**(`status`, `raw`, `hint`?): [`CustodyApiError`](CustodyApiError.md)

Defined in: [errors.ts:166](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L166)

Construct a CustodyApiError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `status` | `number` | The HTTP status code. |
| `raw` | `unknown` | The full response body. |
| `hint`? | `string` | The custodian's `processing.hint`, preserved verbatim. |

#### Returns

[`CustodyApiError`](CustodyApiError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### hint?

> `readonly` `optional` **hint**: `string`

Defined in: [errors.ts:156](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L156)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### raw

> `readonly` **raw**: `unknown`

Defined in: [errors.ts:157](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L157)

***

### status

> `readonly` **status**: `number`

Defined in: [errors.ts:155](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L155)
