# Class: DuplicateSignerError

Defined in: [errors.ts:88](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L88)

Two configured signers point at the same backend tenant — the same
`kind` and the same `tenantId` (§3.1). The client rejects this at init so
one backend is never registered twice; drop the duplicate signer.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new DuplicateSignerError()

> **new DuplicateSignerError**(`kind`, `tenantId`): [`DuplicateSignerError`](DuplicateSignerError.md)

Defined in: [errors.ts:98](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L98)

Construct a DuplicateSignerError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `kind` | [`CustodianKind`](../type-aliases/CustodianKind.md) | The custodian kind registered more than once. |
| `tenantId` | `string` | The shared backend tenant id. |

#### Returns

[`DuplicateSignerError`](DuplicateSignerError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [errors.ts:89](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L89)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### tenantId

> `readonly` **tenantId**: `string`

Defined in: [errors.ts:90](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L90)
