# Class: AccountNotFoundError

Defined in: [errors.ts:48](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L48)

The requested account is not registered on the client.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new AccountNotFoundError()

> **new AccountNotFoundError**(`account`): [`AccountNotFoundError`](AccountNotFoundError.md)

Defined in: [errors.ts:56](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L56)

Construct an AccountNotFoundError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `account` | `string` | The r-address that could not be resolved. |

#### Returns

[`AccountNotFoundError`](AccountNotFoundError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### account

> `readonly` **account**: `string`

Defined in: [errors.ts:49](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L49)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
