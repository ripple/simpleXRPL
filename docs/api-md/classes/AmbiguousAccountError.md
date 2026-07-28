# Class: AmbiguousAccountError

Defined in: [errors.ts:66](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L66)

The same r-address was discovered under more than one custodian at init; the
caller must drop one or supply an explicit per-call override.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new AmbiguousAccountError()

> **new AmbiguousAccountError**(`account`, `custodians`): [`AmbiguousAccountError`](AmbiguousAccountError.md)

Defined in: [errors.ts:76](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L76)

Construct an AmbiguousAccountError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `account` | `string` | The r-address registered under multiple custodians. |
| `custodians` | readonly [`CustodianKind`](../type-aliases/CustodianKind.md)[] | The kinds of the custodians that claim the account. |

#### Returns

[`AmbiguousAccountError`](AmbiguousAccountError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### account

> `readonly` **account**: `string`

Defined in: [errors.ts:67](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L67)

***

### custodians

> `readonly` **custodians**: readonly [`CustodianKind`](../type-aliases/CustodianKind.md)[]

Defined in: [errors.ts:68](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L68)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
