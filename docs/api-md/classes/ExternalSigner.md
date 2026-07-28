# Class: ExternalSigner

Defined in: [custodians/external/external-signer.ts:40](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L40)

A signing backend whose key lives in a KMS or HSM. Like [LocalSigner](LocalSigner.md)
it is a local-family signer — it builds and signs a transaction, then submits
it through the shared ledger — except the private key never enters the
process: the SDK hands a digest to the external signer and assembles the
result (TDD §9). Signs any transactor via the raw path; no native operations.

## Implements

- [`Custodian`](../interfaces/Custodian.md)

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md) = `'external'`

Defined in: [custodians/external/external-signer.ts:42](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L42)

This custodian signs with an external key (KMS/HSM).

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`kind`](../interfaces/Custodian.md#kind)

## Accessors

### primary

#### Get Signature

> **get** **primary**(): [`AccountRef`](../interfaces/AccountRef.md)

Defined in: [custodians/external/external-signer.ts:63](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L63)

The primary (and only) account this signer owns.

##### Returns

[`AccountRef`](../interfaces/AccountRef.md)

The primary account reference.

The custodian's primary account; it owns this account.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`primary`](../interfaces/Custodian.md#primary)

## Methods

### capabilities()

> **capabilities**(): [`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Defined in: [custodians/external/external-signer.ts:88](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L88)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Capabilities allowing any transactor via raw signing.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`capabilities`](../interfaces/Custodian.md#capabilities)

***

### listAccounts()

> **listAccounts**(): `Promise`\<[`Account`](../interfaces/Account.md)[]\>

Defined in: [custodians/external/external-signer.ts:97](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L97)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)[]\>

The one account, keyed by r-address.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`listAccounts`](../interfaces/Custodian.md#listaccounts)

***

### sign()

> **sign**(`tx`, `_ctx`): `Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

Defined in: [custodians/external/external-signer.ts:108](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L108)

Produce a signed envelope for a transaction (raw-signing paths).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The autofilled transaction to sign. |
| `_ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context (unused; this signer owns one key). |

#### Returns

`Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

The signed envelope (blob + hash).

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`sign`](../interfaces/Custodian.md#sign)

***

### submitAndWait()

> **submitAndWait**(`tx`, `ctx`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [custodians/external/external-signer.ts:124](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L124)

Submit and block until the transaction reaches a terminal state. The
custodian returns the transport result; the vertical attaches the typed
`intent` output.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The autofilled transaction to submit. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context (source account + shared ledger). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The xrpld-sourced submission result.

#### Throws

[XrpldSubmitError](XrpldSubmitError.md) on a non-`tesSUCCESS` engine result.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAndWait`](../interfaces/Custodian.md#submitandwait)

***

### submitAsync()

> **submitAsync**(`tx`, `ctx`): `Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

Defined in: [custodians/external/external-signer.ts:157](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L157)

Submit and return a handle once the backend has accepted the intent.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The autofilled transaction to submit. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context (source account + shared ledger). |

#### Returns

`Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

A pre-resolved handle over the submitted transaction.

#### Throws

[XrpldSubmitError](XrpldSubmitError.md) if the transaction fails on-ledger.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAsync`](../interfaces/Custodian.md#submitasync)

***

### create()

> `static` **create**(`options`): `Promise`\<[`ExternalSigner`](ExternalSigner.md)\>

Defined in: [custodians/external/external-signer.ts:73](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/external/external-signer.ts#L73)

Build an external signer: fetch the public key and resolve the account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`ExternalSignerOptions`](../interfaces/ExternalSignerOptions.md) | The external signer and optional account override. |

#### Returns

`Promise`\<[`ExternalSigner`](ExternalSigner.md)\>

A ready signer.
