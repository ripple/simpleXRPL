# Class: RippledSubmitError

Defined in: [errors.ts:199](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L199)

A rippled submission was rejected. The `engineResult` and full response are
preserved verbatim.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new RippledSubmitError()

> **new RippledSubmitError**(`engineResult`, `raw`): [`RippledSubmitError`](RippledSubmitError.md)

Defined in: [errors.ts:209](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L209)

Construct a RippledSubmitError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `engineResult` | `string` | The rippled engine result code (e.g. `tecPATH_DRY`). |
| `raw` | `unknown` | The full rippled response. |

#### Returns

[`RippledSubmitError`](RippledSubmitError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### engineResult

> `readonly` **engineResult**: `string`

Defined in: [errors.ts:200](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L200)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### raw

> `readonly` **raw**: `unknown`

Defined in: [errors.ts:201](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/errors.ts#L201)
