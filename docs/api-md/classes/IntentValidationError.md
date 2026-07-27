# Class: IntentValidationError

Defined in: [errors.ts:32](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L32)

Pre-flight validation failed (intent shape, amount precision, flag rules, or
a custodian dry-run rejection).

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new IntentValidationError()

> **new IntentValidationError**(`message`, `options`?): [`IntentValidationError`](IntentValidationError.md)

Defined in: [errors.ts:18](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L18)

Construct a SimpleXRPLError.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `message` | `string` | `''` | A human-readable description of the failure. |
| `options`? | \{ `cause`: `unknown`; \} | `undefined` | Optional settings. |
| `options.cause`? | `unknown` | `undefined` | The underlying error, for error chaining. |

#### Returns

[`IntentValidationError`](IntentValidationError.md)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
