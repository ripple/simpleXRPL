# Class: CustodyApiError

Defined in: [errors.ts:116](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/errors.ts#L116)

A Ripple Custody API call returned an error. The diagnostic `hint` and full
response body are preserved for the caller to surface.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new CustodyApiError()

> **new CustodyApiError**(`status`, `raw`, `hint`?): [`CustodyApiError`](CustodyApiError.md)

Defined in: [errors.ts:128](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/errors.ts#L128)

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

Defined in: [errors.ts:118](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/errors.ts#L118)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### raw

> `readonly` **raw**: `unknown`

Defined in: [errors.ts:119](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/errors.ts#L119)

***

### status

> `readonly` **status**: `number`

Defined in: [errors.ts:117](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/errors.ts#L117)
