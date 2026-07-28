# Interface: IntentObserver

Defined in: [domain/model.ts:248](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L248)

A custodian that can resume observation of a governance intent it previously
created, addressed by the intent id (§10.4). Only backends with a governed
intent lifecycle (Ripple Custody, Palisade) implement this; a local wallet
has no intents to observe. The client's intent inspector uses it to poll or
await an intent whose original submission has already returned.

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:250](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L250)

Which backend owns the intents this observer resumes.

***

### observeIntent()

> `readonly` **observeIntent**: (`intentId`) => [`SubmissionHandle`](SubmissionHandle.md)

Defined in: [domain/model.ts:258](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L258)

Build a handle over an intent this custodian previously created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The client-generated intent id returned at submission. |

#### Returns

[`SubmissionHandle`](SubmissionHandle.md)

A handle to poll or wait on the existing intent's outcome.
