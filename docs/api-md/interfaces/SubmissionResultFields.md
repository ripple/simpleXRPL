# Interface: SubmissionResultFields\<T\>

Defined in: [domain/model.ts:131](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L131)

Fields shared by every [SubmissionResult](../type-aliases/SubmissionResult.md) variant.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:146](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L146)

The stable, client-generated id (a UUIDv7) this submission carried (§8).
Re-submitting with the same id resolves to the same intent rather than
creating a duplicate; pass it back as a verb's `idempotencyKey` to retry.

***

### intent

> `readonly` **intent**: `T`

Defined in: [domain/model.ts:133](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L133)

Vertical-specific output (e.g. a minted token id).

***

### intentId?

> `readonly` `optional` **intentId**: `string`

Defined in: [domain/model.ts:136](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L136)

Custodian intent id, when the path produced one.

***

### txHash?

> `readonly` `optional` **txHash**: `string`

Defined in: [domain/model.ts:139](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L139)

XRPL transaction hash once the transaction is on-ledger.
