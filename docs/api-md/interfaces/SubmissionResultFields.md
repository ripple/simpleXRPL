# Interface: SubmissionResultFields\<T\>

Defined in: [domain/model.ts:156](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L156)

Fields shared by every [SubmissionResult](../type-aliases/SubmissionResult.md) variant.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:187](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L187)

The stable, client-generated id (a UUIDv7) this submission carried.
Re-submitting with the same id lets a retry resolve to the same submission
rather than creating a duplicate; pass it back as an operation's
`idempotencyKey` to retry safely.

How completely the key de-duplicates depends on the backend:
- **Local (`xrpld`):** no custodian de-duplication layer. A re-submit with
  the same key builds a distinct transaction — safety rests on the
  operation being idempotent and on `LastLedgerSequence` bounding it, so
  wait for a transaction to reach a terminal on-ledger state before
  retrying.
- **Ripple Custody:** de-duplicated at the intent layer for every
  operation. A re-submit with a used key resolves to the existing intent
  transparently (the SDK absorbs the custodian's conflict response).
- **Palisade:** de-duplicated only on the payment path (`xrp.transfer`,
  `iou.transfer`) — the sole operation whose wire schema carries the key.
  Other operations (account settings, trust lines, offers) are NOT
  de-duplicated custodian-side, so re-submitting one can apply it twice;
  retry those only once the prior attempt is known to be provably dead.

***

### intent

> `readonly` **intent**: `T`

Defined in: [domain/model.ts:158](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L158)

Vertical-specific output (e.g. a minted token id).

***

### intentId?

> `readonly` `optional` **intentId**: `string`

Defined in: [domain/model.ts:161](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L161)

Custodian intent id, when the path produced one.

***

### txHash?

> `readonly` `optional` **txHash**: `string`

Defined in: [domain/model.ts:164](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L164)

XRPL transaction hash once the transaction is on-ledger.
