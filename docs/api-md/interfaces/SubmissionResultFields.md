# Interface: SubmissionResultFields\<T\>

Defined in: [src/domain/model.ts:127](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L127)

Fields shared by every [SubmissionResult](../type-aliases/SubmissionResult.md) variant.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### intent

> `readonly` **intent**: `T`

Defined in: [src/domain/model.ts:129](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L129)

Vertical-specific output (e.g. a minted token id).

***

### intentId?

> `readonly` `optional` **intentId**: `string`

Defined in: [src/domain/model.ts:132](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L132)

Custodian intent id, when the path produced one.

***

### txHash?

> `readonly` `optional` **txHash**: `string`

Defined in: [src/domain/model.ts:135](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L135)

XRPL transaction hash once the transaction is on-ledger.
