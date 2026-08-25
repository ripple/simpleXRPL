# Interface: IntentObserver

Defined in: [domain/model.ts:290](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L290)

A custodian that can resume observation of a governance intent it previously
created, addressed by the intent id. Only backends with a resumable intent
lifecycle implement this — currently Ripple Custody. Palisade hands back a
live handle at submission but exposes no by-id resume, and a local wallet has
no intents to observe. The client's intent inspector uses it to poll or await
an intent whose original submission has already returned.

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:292](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L292)

Which backend owns the intents this observer resumes.

***

### observeIntent()

> `readonly` **observeIntent**: (`intentId`) => [`SubmissionHandle`](SubmissionHandle.md)

Defined in: [domain/model.ts:300](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L300)

Build a handle over an intent this custodian previously created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The client-generated intent id returned at submission. |

#### Returns

[`SubmissionHandle`](SubmissionHandle.md)

A handle to poll or wait on the existing intent's outcome.
