# Interface: Custodian

Defined in: [domain/model.ts:196](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L196)

A signing backend. Each implementation (local, Ripple Custody, Palisade)
adapts the canonical xrpl.js transaction to one backend's API and submission
flow, and is the unit of configuration on a client.

## Properties

### capabilities()

> `readonly` **capabilities**: () => [`SignerCapabilities`](SignerCapabilities.md)

Defined in: [domain/model.ts:216](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L216)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](SignerCapabilities.md)

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [domain/model.ts:198](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L198)

Which backend this custodian adapts.

***

### listAccounts()

> `readonly` **listAccounts**: () => `Promise`\<[`Account`](Account.md)[]\>

Defined in: [domain/model.ts:213](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L213)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](Account.md)[]\>

***

### primary

> `readonly` **primary**: [`AccountRef`](AccountRef.md)

Defined in: [domain/model.ts:210](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L210)

The custodian's primary account; it owns this account.

***

### sign()

> `readonly` **sign**: (`tx`, `ctx`) => `Promise`\<[`SignedEnvelope`](SignedEnvelope.md)\>

Defined in: [domain/model.ts:219](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L219)

Produce a signed envelope for a transaction (raw-signing paths).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tx` | `Transaction` |
| `ctx` | [`SubmissionContext`](SubmissionContext.md) |

#### Returns

`Promise`\<[`SignedEnvelope`](SignedEnvelope.md)\>

***

### submitAndWait()

> `readonly` **submitAndWait**: (`tx`, `ctx`) => `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

Defined in: [domain/model.ts:229](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L229)

Submit and block until the transaction reaches a terminal state. The
custodian returns the transport result; the vertical attaches the typed
`intent` output.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tx` | `Transaction` |
| `ctx` | [`SubmissionContext`](SubmissionContext.md) |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`unknown`\>\>

***

### submitAsync()

> `readonly` **submitAsync**: (`tx`, `ctx`) => `Promise`\<[`SubmissionHandle`](SubmissionHandle.md)\>

Defined in: [domain/model.ts:235](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L235)

Submit and return a handle once the backend has accepted the intent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tx` | `Transaction` |
| `ctx` | [`SubmissionContext`](SubmissionContext.md) |

#### Returns

`Promise`\<[`SubmissionHandle`](SubmissionHandle.md)\>

***

### tenantId?

> `readonly` `optional` **tenantId**: `string`

Defined in: [domain/model.ts:207](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L207)

The backend tenant this custodian is bound to — a Custody domain id, a
Palisade org/client identity, etc. Two signers with the same `kind` and
the same `tenantId` point at the same backend tenant, which the client
rejects at init (§3.1). `undefined` for backends with no tenant notion
(e.g. a local wallet holder), so multiple of those may coexist freely.
