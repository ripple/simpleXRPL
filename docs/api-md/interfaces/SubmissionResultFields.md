# Interface: SubmissionResultFields\<T\>

Defined in: [domain/model.ts:141](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L141)

Fields shared by every [SubmissionResult](../type-aliases/SubmissionResult.md) variant.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:156](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L156)

The stable, client-generated id (a UUIDv7) this submission carried (§8).
Re-submitting with the same id resolves to the same intent rather than
creating a duplicate; pass it back as an operation's `idempotencyKey` to retry.

***

### intent

> `readonly` **intent**: `T`

Defined in: [domain/model.ts:143](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L143)

Vertical-specific output (e.g. a minted token id).

***

### intentId?

> `readonly` `optional` **intentId**: `string`

Defined in: [domain/model.ts:146](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L146)

Custodian intent id, when the path produced one.

***

### txHash?

> `readonly` `optional` **txHash**: `string`

Defined in: [domain/model.ts:149](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L149)

XRPL transaction hash once the transaction is on-ledger.
