# Class: DuplicateSignerError

Defined in: [errors.ts:126](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L126)

Two configured signers point at the same backend tenant — the same
`kind` and the same `tenantId` (§3.1). The client rejects this at init so
one backend is never registered twice; drop the duplicate signer.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new DuplicateSignerError()

> **new DuplicateSignerError**(`kind`, `tenantId`): [`DuplicateSignerError`](DuplicateSignerError.md)

Defined in: [errors.ts:136](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L136)

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

Defined in: [errors.ts:127](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L127)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)

***

### tenantId

> `readonly` **tenantId**: `string`

Defined in: [errors.ts:128](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L128)
