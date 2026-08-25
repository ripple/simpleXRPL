# Class: IntentInspector

Defined in: [client/intent-inspector.ts:36](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L36)

Read-only observation of custodian governance intents the SDK previously
created: resume polling or waiting on an intent by id after its
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

Defined in: [client/intent-inspector.ts:46](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L46)

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

Defined in: [client/intent-inspector.ts:74](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L74)

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

### awaitOnChain()

> **awaitOnChain**(`intentId`, `timeoutMs`?): `Promise`\<`undefined` \| [`OnChainResult`](../interfaces/OnChainResult.md)\>

Defined in: [client/intent-inspector.ts:107](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L107)

Poll the custodian's transaction layer until the XRPL transaction linked to
`intentId` is confirmed on-chain, then return its outcome.

This covers the second async layer that [await](IntentInspector.md#await) does not: `await`
returns when the governance intent reaches `Executed` (policy approved),
while `awaitOnChain` returns when the XRPL transaction is actually
confirmed on the ledger. Both calls are needed to know that funds or state
changes have fully landed.

Only available when a Ripple Custody signer is configured.

Resolves to the on-chain result once confirmed. Returns `undefined` if the
timeout elapses with the transaction still in flight — indeterminate, so
re-drive the *same* idempotency key. Throws [IntentValidationError](IntentValidationError.md)
the moment the transaction reaches a terminal non-confirmed state
(`Expired`, `Replaced`, or an on-chain failure) — provably dead, so a retry
needs a *fresh* key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent id returned at submission. |
| `timeoutMs`? | `number` | How long to poll before giving up (custodian default if omitted). |

#### Returns

`Promise`\<`undefined` \| [`OnChainResult`](../interfaces/OnChainResult.md)\>

The on-chain result, or `undefined` when the timeout elapses with
  the transaction still in flight.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no Ripple Custody signer is configured.

#### Throws

[IntentValidationError](IntentValidationError.md) if the transaction is provably dead.

***

### handleFor()

> **handleFor**(`intentId`): [`SubmissionHandle`](../interfaces/SubmissionHandle.md)

Defined in: [client/intent-inspector.ts:127](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L127)

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

Defined in: [client/intent-inspector.ts:60](https://github.com/ripple/simpleXRPL/blob/main/src/client/intent-inspector.ts#L60)

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
