# Class: PalisadeApiError

Defined in: [errors.ts:184](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L184)

A Palisade API call returned an error. The diagnostic `hint` (the
`rpcStatus.message` Palisade's equivalent of Custody's `processing.hint`)
and full response body are preserved for the caller to surface.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new PalisadeApiError()

> **new PalisadeApiError**(`status`, `raw`, `hint`?): [`PalisadeApiError`](PalisadeApiError.md)

Defined in: [errors.ts:196](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L196)

Construct a PalisadeApiError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `status` | `number` | The HTTP status code. |
| `raw` | `unknown` | The full response body. |
| `hint`? | `string` | Palisade's `rpcStatus.message`, preserved verbatim. |

#### Returns

[`PalisadeApiError`](PalisadeApiError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### hint?

> `readonly` `optional` **hint**: `string`

Defined in: [errors.ts:186](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L186)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### raw

> `readonly` **raw**: `unknown`

Defined in: [errors.ts:187](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L187)

***

### status

> `readonly` **status**: `number`

Defined in: [errors.ts:185](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L185)
