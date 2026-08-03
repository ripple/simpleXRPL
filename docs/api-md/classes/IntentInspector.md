# Class: IntentInspector

Defined in: [client/intent-inspector.ts:34](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L34)

Read-only observation of custodian governance intents the SDK previously
created (TDD §10.4): resume polling or waiting on an intent by id after its
original submission has already returned (e.g. after a `submitAndWait`
timed out with an [IntentPendingError](IntentPendingError.md), or a `submitAsync` handle was
not retained). The SDK is a proposer/observer only — it never approves,
rejects, or configures policy.

Only custodians that expose governance intents by id (Ripple Custody) are
observable here. Palisade intents are observed through the handle returned by
`submitAsync` (`poll()`/`wait()`) instead: its transactions are wallet-scoped
and can't be addressed by an intent id alone.

## Constructors

### new IntentInspector()

> **new IntentInspector**(`signers`): [`IntentInspector`](IntentInspector.md)

Defined in: [client/intent-inspector.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L43)

Construct an intent inspector over the client's signers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `signers` | readonly [`Custodian`](../interfaces/Custodian.md)[] | The client's registered custodians; those that can observe governance intents (Ripple Custody) are retained. |

#### Returns

[`IntentInspector`](IntentInspector.md)

## Methods

### await()

> **await**(`intentId`, `timeoutMs`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [client/intent-inspector.ts:68](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L68)

Resume blocking on an intent until it reaches a terminal state.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent id returned at submission. |
| `timeoutMs`? | `number` | How long to wait before giving up (custodian default if omitted). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The terminal submission result.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no configured custodian can observe intents.

#### Throws

[IntentValidationError](IntentValidationError.md) if the intent is rejected, expired, or failed.

#### Throws

[IntentPendingError](IntentPendingError.md) if the timeout elapses while still pending.

***

### handleFor()

> **handleFor**(`intentId`): [`SubmissionHandle`](../interfaces/SubmissionHandle.md)

Defined in: [client/intent-inspector.ts:83](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L83)

Build a handle over an intent by id, via the first custodian that can
observe governance intents.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent id to observe. |

#### Returns

[`SubmissionHandle`](../interfaces/SubmissionHandle.md)

A handle to poll or wait on the intent.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no configured custodian can observe intents.

***

### status()

> **status**(`intentId`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [client/intent-inspector.ts:54](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L54)

A non-blocking snapshot of an intent's current state.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent id returned at submission. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The current submission-result snapshot (read `response.state`).

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no configured custodian can observe intents.
