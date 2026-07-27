# Class: SignerCapabilityError

Defined in: [errors.ts:38](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L38)

The resolved custodian cannot sign the requested transactor and the
raw-signing fallback is not available.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new SignerCapabilityError()

> **new SignerCapabilityError**(`message`, `options`?): [`SignerCapabilityError`](SignerCapabilityError.md)

Defined in: [errors.ts:18](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L18)

Construct a SimpleXRPLError.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `message` | `string` | `''` | A human-readable description of the failure. |
| `options`? | \{ `cause`: `unknown`; \} | `undefined` | Optional settings. |
| `options.cause`? | `unknown` | `undefined` | The underlying error, for error chaining. |

#### Returns

[`SignerCapabilityError`](SignerCapabilityError.md)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
