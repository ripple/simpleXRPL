# Class: XrpldSubmitError

Defined in: [errors.ts:237](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L237)

A xrpld submission was rejected. The `engineResult` and full response are
preserved verbatim.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new XrpldSubmitError()

> **new XrpldSubmitError**(`engineResult`, `raw`): [`XrpldSubmitError`](XrpldSubmitError.md)

Defined in: [errors.ts:247](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L247)

Construct a XrpldSubmitError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `engineResult` | `string` | The xrpld engine result code (e.g. `tecPATH_DRY`). |
| `raw` | `unknown` | The full xrpld response. |

#### Returns

[`XrpldSubmitError`](XrpldSubmitError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### engineResult

> `readonly` **engineResult**: `string`

Defined in: [errors.ts:238](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L238)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### raw

> `readonly` **raw**: `unknown`

Defined in: [errors.ts:239](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L239)
