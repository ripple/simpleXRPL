# Class: XrpldSubmitError

Defined in: [errors.ts:288](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L288)

A xrpld submission was rejected. The `engineResult` and full response are
preserved verbatim.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new XrpldSubmitError()

> **new XrpldSubmitError**(`engineResult`, `raw`): [`XrpldSubmitError`](XrpldSubmitError.md)

Defined in: [errors.ts:298](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L298)

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

Defined in: [errors.ts:289](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L289)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### raw

> `readonly` **raw**: `unknown`

Defined in: [errors.ts:290](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L290)
