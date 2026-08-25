# Class: SimpleXRPLError

Defined in: [errors.ts:8](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L8)

Base class for every error thrown by simpleXRPL. Errors are pass-through but
typed: distinct underlying failure modes are not flattened into one class.

## Extends

- `Error`

## Extended by

- [`IntentValidationError`](IntentValidationError.md)
- [`SignerCapabilityError`](SignerCapabilityError.md)
- [`NoSignerError`](NoSignerError.md)
- [`AccountNotFoundError`](AccountNotFoundError.md)
- [`AmbiguousAccountError`](AmbiguousAccountError.md)
- [`NetworkMismatchError`](NetworkMismatchError.md)
- [`DuplicateSignerError`](DuplicateSignerError.md)
- [`CustodyAuthError`](CustodyAuthError.md)
- [`CustodyApiError`](CustodyApiError.md)
- [`PalisadeAuthError`](PalisadeAuthError.md)
- [`PalisadeApiError`](PalisadeApiError.md)
- [`PalisadeRejectedError`](PalisadeRejectedError.md)
- [`IntentPendingError`](IntentPendingError.md)
- [`XrpldSubmitError`](XrpldSubmitError.md)
- [`MultiStepFailureError`](MultiStepFailureError.md)

## Constructors

### new SimpleXRPLError()

> **new SimpleXRPLError**(`message`, `options`?): [`SimpleXRPLError`](SimpleXRPLError.md)

Defined in: [errors.ts:18](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L18)

Construct a SimpleXRPLError.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `message` | `string` | `''` | A human-readable description of the failure. |
| `options`? | \{ `cause`: `unknown`; \} | `undefined` | Optional settings. |
| `options.cause`? | `unknown` | `undefined` | The underlying error, for error chaining. |

#### Returns

[`SimpleXRPLError`](SimpleXRPLError.md)

#### Overrides

`Error.constructor`

## Properties

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Overrides

`Error.name`
