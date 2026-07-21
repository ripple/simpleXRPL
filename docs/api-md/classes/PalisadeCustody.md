# Class: PalisadeCustody

Defined in: [src/custodians/palisade/palisade-custody.ts:48](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L48)

The Palisade custodian: signs and submits through Palisade's vault/wallet API.
A transactor Palisade models natively uses its `Submit*`/transfer op; anything
else falls back to the raw sign-only path (`allowRawSigning`) and is submitted
through the shared ledger. Native submissions can also run async, returning a
handle to poll, wait on, or cancel.

## Implements

- [`Custodian`](../interfaces/Custodian.md)

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md) = `'palisade-custody'`

Defined in: [src/custodians/palisade/palisade-custody.ts:49](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L49)

Which backend this custodian adapts.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`kind`](../interfaces/Custodian.md#kind)

## Accessors

### primary

#### Get Signature

> **get** **primary**(): [`AccountRef`](../interfaces/AccountRef.md)

Defined in: [src/custodians/palisade/palisade-custody.ts:74](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L74)

The primary account this custodian owns.

##### Throws

[SimpleXRPLError](SimpleXRPLError.md) if the custodian is not fully initialized.

##### Returns

[`AccountRef`](../interfaces/AccountRef.md)

The primary account reference.

The custodian's primary account; it owns this account.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`primary`](../interfaces/Custodian.md#primary)

## Methods

### capabilities()

> **capabilities**(): [`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Defined in: [src/custodians/palisade/palisade-custody.ts:124](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L124)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](../interfaces/SignerCapabilities.md)

This custodian's signer capabilities.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`capabilities`](../interfaces/Custodian.md#capabilities)

***

### listAccounts()

> **listAccounts**(): `Promise`\<[`Account`](../interfaces/Account.md)[]\>

Defined in: [src/custodians/palisade/palisade-custody.ts:136](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L136)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)[]\>

The accounts this custodian owns.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`listAccounts`](../interfaces/Custodian.md#listaccounts)

***

### sign()

> **sign**(`tx`, `ctx`): `Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

Defined in: [src/custodians/palisade/palisade-custody.ts:148](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L148)

Produce a signed envelope for a transaction (raw-signing paths).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The transaction to sign (network fields resolved). |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context (source account + ledger). |

#### Returns

`Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

The signed envelope.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`sign`](../interfaces/Custodian.md#sign)

***

### submitAndWait()

> **submitAndWait**(`tx`, `ctx`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [src/custodians/palisade/palisade-custody.ts:176](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L176)

Submit and block until the transaction reaches a terminal state. The
custodian returns the transport result; the vertical attaches the typed
`intent` output.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The autofilled transaction. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

The submission result.

#### Throws

[SignerCapabilityError](SignerCapabilityError.md) if unsupported and raw is disabled.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAndWait`](../interfaces/Custodian.md#submitandwait)

***

### submitAsync()

> **submitAsync**(`tx`, `ctx`): `Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

Defined in: [src/custodians/palisade/palisade-custody.ts:211](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L211)

Submit and return a handle once the backend has accepted the intent.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The transaction to submit. |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context. |

#### Returns

`Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

A handle over the pending Palisade transaction.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if the transactor has no native path.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAsync`](../interfaces/Custodian.md#submitasync)

***

### create()

> `static` **create**(`config`): `Promise`\<[`PalisadeCustody`](PalisadeCustody.md)\>

Defined in: [src/custodians/palisade/palisade-custody.ts:92](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/palisade-custody.ts#L92)

Build a Palisade custodian: exchange credentials, discover the org's XRPL
wallets, and bind the configured primary.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | [`PalisadeCustodyConfig`](../interfaces/PalisadeCustodyConfig.md) | Endpoints, credentials, primary wallet, and options. |

#### Returns

`Promise`\<[`PalisadeCustody`](PalisadeCustody.md)\>

A ready custodian.

#### Throws

[AccountNotFoundError](AccountNotFoundError.md) if the primary wallet isn't discovered.
