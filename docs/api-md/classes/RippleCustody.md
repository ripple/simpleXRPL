# Class: RippleCustody

Defined in: [custodians/ripple/ripple-custody.ts:49](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L49)

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

Defined in: [custodians/ripple/ripple-custody.ts:51](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L51)

This custodian wraps the Custody REST API.

#### Implementation of

[`IntentObserver`](../interfaces/IntentObserver.md).[`kind`](../interfaces/IntentObserver.md#kind)

## Accessors

### primary

#### Get Signature

> **get** **primary**(): [`AccountRef`](../interfaces/AccountRef.md)

Defined in: [custodians/ripple/ripple-custody.ts:64](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L64)

The primary account this custodian owns.

##### Returns

[`AccountRef`](../interfaces/AccountRef.md)

The primary account reference.

The custodian's primary account; it owns this account.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`primary`](../interfaces/Custodian.md#primary)

## Methods

### capabilities()

> **capabilities**(): [`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Defined in: [custodians/ripple/ripple-custody.ts:108](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L108)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](../interfaces/SignerCapabilities.md)

This custodian's capabilities.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`capabilities`](../interfaces/Custodian.md#capabilities)

***

### listAccounts()

> **listAccounts**(): `Promise`\<[`Account`](../interfaces/Account.md)[]\>

Defined in: [custodians/ripple/ripple-custody.ts:121](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L121)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)[]\>

The discovered accounts.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`listAccounts`](../interfaces/Custodian.md#listaccounts)

***

### observeIntent()

> **observeIntent**(`intentId`): [`SubmissionHandle`](../interfaces/SubmissionHandle.md)

Defined in: [custodians/ripple/ripple-custody.ts:208](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L208)

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

### sign()

> **sign**(`tx`, `ctx`): `Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:137](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L137)

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

Defined in: [custodians/ripple/ripple-custody.ts:157](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L157)

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

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAndWait`](../interfaces/Custodian.md#submitandwait)

***

### submitAsync()

> **submitAsync**(`tx`, `ctx`): `Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

Defined in: [custodians/ripple/ripple-custody.ts:187](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L187)

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

Defined in: [custodians/ripple/ripple-custody.ts:79](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L79)

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

Defined in: [custodians/ripple/ripple-custody.ts:97](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/ripple-custody.ts#L97)

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
