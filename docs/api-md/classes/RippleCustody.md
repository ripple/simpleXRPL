# Class: RippleCustody

Defined in: [custodians/ripple/ripple-custody.ts:55](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L55)

Ripple Custody adapter (TDD §3.3, §7.2): wraps the Custody REST API v1.
Native transactors (NATIVE\_XRPL\_TRANSACTORS) submit as a governed
`v0_CreateTransactionOrder` intent; everything else falls back to the
opt-in raw-signing path (`v0_SignManifest` + `Unsafe`) when
`allowRawSigning` is enabled.

## Implements

- [`Custodian`](../interfaces/Custodian.md)
- [`IntentObserver`](../interfaces/IntentObserver.md)

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md) = `'ripple-custody'`

Defined in: [custodians/ripple/ripple-custody.ts:57](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L57)

This custodian wraps the Custody REST API.

#### Implementation of

[`IntentObserver`](../interfaces/IntentObserver.md).[`kind`](../interfaces/IntentObserver.md#kind)

## Accessors

### primary

#### Get Signature

> **get** **primary**(): [`AccountRef`](../interfaces/AccountRef.md)

Defined in: [custodians/ripple/ripple-custody.ts:80](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L80)

The primary account this custodian owns.

##### Returns

[`AccountRef`](../interfaces/AccountRef.md)

The primary account reference.

The custodian's primary account; it owns this account.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`primary`](../interfaces/Custodian.md#primary)

***

### tenantId

#### Get Signature

> **get** **tenantId**(): `string`

Defined in: [custodians/ripple/ripple-custody.ts:71](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L71)

The Custody domain this custodian is bound to — the tenant two instances
collide on, which the client rejects at init.

##### Returns

`string`

The domain id.

The backend tenant this custodian is bound to — a Custody domain id, a
Palisade org/client identity, etc. Two signers with the same `kind` and
the same `tenantId` point at the same backend tenant, which the client
rejects at init (§3.1). `undefined` for backends with no tenant notion
(e.g. a local wallet holder), so multiple of those may coexist freely.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`tenantId`](../interfaces/Custodian.md#tenantid)

## Methods

### capabilities()

> **capabilities**(): [`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Defined in: [custodians/ripple/ripple-custody.ts:124](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L124)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](../interfaces/SignerCapabilities.md)

This custodian's capabilities.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`capabilities`](../interfaces/Custodian.md#capabilities)

***

### listAccounts()

> **listAccounts**(): `Promise`\<[`Account`](../interfaces/Account.md)[]\>

Defined in: [custodians/ripple/ripple-custody.ts:137](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L137)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)[]\>

The discovered accounts.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`listAccounts`](../interfaces/Custodian.md#listaccounts)

***

### observeIntent()

> **observeIntent**(`intentId`): [`SubmissionHandle`](../interfaces/SubmissionHandle.md)

Defined in: [custodians/ripple/ripple-custody.ts:271](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L271)

Build a handle over an intent this custodian previously created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The client-generated intent id returned at submission. |

#### Returns

[`SubmissionHandle`](../interfaces/SubmissionHandle.md)

A handle to poll or wait on the intent's outcome.

#### Implementation of

[`IntentObserver`](../interfaces/IntentObserver.md).[`observeIntent`](../interfaces/IntentObserver.md#observeintent)

***

### pollMptIssuanceId()

> **pollMptIssuanceId**(`intentId`): `Promise`\<`string`\>

Defined in: [custodians/ripple/ripple-custody.ts:258](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L258)

Convenience wrapper for `Token.issue`: polls until the transaction is
confirmed and returns the MPT issuance ID, or an empty string on timeout.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent/order ID to look up. |

#### Returns

`Promise`\<`string`\>

The MPT issuance ID, or an empty string on timeout.

***

### pollTransactionOnChain()

> **pollTransactionOnChain**(`intentId`, `timeoutMs`?): `Promise`\<`undefined` \| [`OnChainResult`](../interfaces/OnChainResult.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:239](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L239)

Poll the Custody transaction layer until the on-chain transaction linked to
`intentId` is confirmed, then return its MPT issuance ID. Returns an empty
string if the transaction is not confirmed within `timeoutMs`.

Poll the Custody transaction layer until the XRPL transaction linked to
`intentId` is confirmed on-chain, then return its outcome.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent/order ID to look up. |
| `timeoutMs`? | `number` | How long to poll (defaults to the custodian's configured intent timeout). |

#### Returns

`Promise`\<`undefined` \| [`OnChainResult`](../interfaces/OnChainResult.md)\>

The on-chain result once confirmed, or `undefined` on timeout.

***

### sign()

> **sign**(`tx`, `ctx`): `Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:153](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L153)

Produce a signed envelope for a transaction (raw-signing paths).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The fully autofilled transaction to sign. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context (source account, dry-run/timeout options). |

#### Returns

`Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

The signed transaction blob and hash.

#### Throws

[SignerCapabilityError](SignerCapabilityError.md) if `tx`'s transactor is native, or
raw signing is disabled.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`sign`](../interfaces/Custodian.md#sign)

***

### submitAndWait()

> **submitAndWait**(`tx`, `ctx`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:175](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L175)

Submit and block until the transaction reaches a terminal state. The
custodian returns the transport result; the vertical attaches the typed
`intent` output.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The fully autofilled transaction to submit. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The submission result.

#### Throws

[SignerCapabilityError](SignerCapabilityError.md) if raw signing is required but disabled.

#### Throws

[IntentPendingError](IntentPendingError.md) if the custodian intent doesn't reach a
terminal state before the timeout.

#### Throws

[XrpldSubmitError](XrpldSubmitError.md) on a non-`tesSUCCESS` engine result from
the raw path.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAndWait`](../interfaces/Custodian.md#submitandwait)

***

### submitAsync()

> **submitAsync**(`tx`, `ctx`): `Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:213](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L213)

Submit and return a handle once the backend has accepted the intent.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The fully autofilled transaction to submit. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context. |

#### Returns

`Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

A handle over the accepted intent.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if `tx` needs the raw-signing path — async
submission there is not yet supported (use `submitAndWait`).

#### Throws

[SignerCapabilityError](SignerCapabilityError.md) if the custodian cannot sign the transactor.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAsync`](../interfaces/Custodian.md#submitasync)

***

### create()

> `static` **create**(`options`): `Promise`\<[`RippleCustody`](RippleCustody.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:95](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L95)

Authenticate, resolve the intent-author's identity, and discover the
domain's XRPL accounts.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`RippleCustodyOptions`](../interfaces/RippleCustodyOptions.md) | Gateway/auth/domain config, the primary account, and optional raw-signing/fee/dry-run/timeout defaults. |

#### Returns

`Promise`\<[`RippleCustody`](RippleCustody.md)\>

A ready RippleCustody.

#### Throws

[CustodyAuthError](CustodyAuthError.md) if the authenticated user has no access
to `options.domainId`.

#### Throws

[AccountNotFoundError](AccountNotFoundError.md) if `options.primary` was not discovered.

***

### fromEnv()

> `static` **fromEnv**(`options`): `Promise`\<[`RippleCustody`](RippleCustody.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:113](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/ripple-custody.ts#L113)

Build a RippleCustody from `RIPPLE_CUSTODY_*` environment variables (TDD
§3.3).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`RippleCustodyFromEnvOptions`](../interfaces/RippleCustodyFromEnvOptions.md) | The primary account, optional overrides, and environment source. |

#### Returns

`Promise`\<[`RippleCustody`](RippleCustody.md)\>

A ready RippleCustody.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if a required environment variable is missing.
