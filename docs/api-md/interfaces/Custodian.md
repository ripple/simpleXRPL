# Interface: Custodian

Defined in: [src/domain/model.ts:185](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L185)

A signing backend. Each implementation (local, Ripple Custody, Palisade)
adapts the canonical xrpl.js transaction to one backend's API and submission
flow, and is the unit of configuration on a client.

## Properties

### capabilities()

> `readonly` **capabilities**: () => [`SignerCapabilities`](SignerCapabilities.md)

Defined in: [src/domain/model.ts:196](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L196)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](SignerCapabilities.md)

***

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

Defined in: [src/domain/model.ts:187](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L187)

Which backend this custodian adapts.

***

### listAccounts()

> `readonly` **listAccounts**: () => `Promise`\<[`Account`](Account.md)[]\>

Defined in: [src/domain/model.ts:193](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L193)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](Account.md)[]\>

***

### primary

> `readonly` **primary**: [`AccountRef`](AccountRef.md)

Defined in: [src/domain/model.ts:190](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L190)

The custodian's primary account; it owns this account.

***

### sign()

> `readonly` **sign**: (`tx`, `ctx`) => `Promise`\<[`SignedEnvelope`](SignedEnvelope.md)\>

Defined in: [src/domain/model.ts:199](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L199)

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

Defined in: [src/domain/model.ts:209](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L209)

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

Defined in: [src/domain/model.ts:215](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L215)

Submit and return a handle once the backend has accepted the intent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tx` | `Transaction` |
| `ctx` | [`SubmissionContext`](SubmissionContext.md) |

#### Returns

`Promise`\<[`SubmissionHandle`](SubmissionHandle.md)\>
