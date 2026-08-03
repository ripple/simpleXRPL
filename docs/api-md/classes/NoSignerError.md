# Class: NoSignerError

Defined in: [errors.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L43)

A write was attempted on a client with no signer configured.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new NoSignerError()

> **new NoSignerError**(`message`, `options`?): [`NoSignerError`](NoSignerError.md)

Defined in: [errors.ts:18](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L18)

Construct a SimpleXRPLError.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `message` | `string` | `''` | A human-readable description of the failure. |
| `options`? | \{ `cause`: `unknown`; \} | `undefined` | Optional settings. |
| `options.cause`? | `unknown` | `undefined` | The underlying error, for error chaining. |

#### Returns

[`NoSignerError`](NoSignerError.md)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
