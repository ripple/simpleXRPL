# Interface: SubmissionResultFields\<T\>

Defined in: [domain/model.ts:151](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L151)

Fields shared by every [SubmissionResult](../type-aliases/SubmissionResult.md) variant.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:166](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L166)

The stable, client-generated id (a UUIDv7) this submission carried (§8).
Re-submitting with the same id resolves to the same intent rather than
creating a duplicate; pass it back as an operation's `idempotencyKey` to retry.

***

### intent

> `readonly` **intent**: `T`

Defined in: [domain/model.ts:153](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L153)

Vertical-specific output (e.g. a minted token id).

***

### intentId?

> `readonly` `optional` **intentId**: `string`

Defined in: [domain/model.ts:156](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L156)

Custodian intent id, when the path produced one.

***

### txHash?

> `readonly` `optional` **txHash**: `string`

Defined in: [domain/model.ts:159](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L159)

XRPL transaction hash once the transaction is on-ledger.
