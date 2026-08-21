# Class: LocalSigner

Defined in: [custodians/local/local-signer.ts:52](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L52)

A local signing backend that holds one or more `xrpl` wallets and signs
transactions in-process. Local is intended for development and utility
accounts; production accounts should use a governed custodian.

Seed and mnemonic sourcing is the caller's responsibility. (Mnemonic
construction is intentionally omitted — the underlying `xrpl` helper is
deprecated.)

## Implements

- [`Custodian`](../interfaces/Custodian.md)

## Properties

### kind

> `readonly` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md) = `'local'`

Defined in: [custodians/local/local-signer.ts:54](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L54)

This custodian signs locally.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`kind`](../interfaces/Custodian.md#kind)

## Accessors

### primary

#### Get Signature

> **get** **primary**(): [`AccountRef`](../interfaces/AccountRef.md)

Defined in: [custodians/local/local-signer.ts:77](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L77)

The primary account this signer owns.

##### Returns

[`AccountRef`](../interfaces/AccountRef.md)

The primary account reference.

The custodian's primary account; it owns this account.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`primary`](../interfaces/Custodian.md#primary)

## Methods

### capabilities()

> **capabilities**(): [`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Defined in: [custodians/local/local-signer.ts:173](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L173)

What this custodian can sign, consulted at dispatch time.

#### Returns

[`SignerCapabilities`](../interfaces/SignerCapabilities.md)

Capabilities allowing any transactor via raw signing.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`capabilities`](../interfaces/Custodian.md#capabilities)

***

### listAccounts()

> **listAccounts**(): `Promise`\<[`Account`](../interfaces/Account.md)[]\>

Defined in: [custodians/local/local-signer.ts:182](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L182)

The full account list, discovered at construction.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)[]\>

One account per wallet, keyed by r-address.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`listAccounts`](../interfaces/Custodian.md#listaccounts)

***

### sign()

> **sign**(`tx`, `ctx`): `Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

Defined in: [custodians/local/local-signer.ts:198](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L198)

Produce a signed envelope for a transaction (raw-signing paths).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The transaction to sign (network fields already resolved). |
| `ctx` | [`SubmissionContext`](../interfaces/SubmissionContext.md) | The submission context naming the source account. |

#### Returns

`Promise`\<[`SignedEnvelope`](../interfaces/SignedEnvelope.md)\>

The signed envelope (blob + hash).

#### Throws

[AccountNotFoundError](AccountNotFoundError.md) if no wallet owns the context account.

#### Throws

[SignerCapabilityError](SignerCapabilityError.md) if the context asks for a dry-run.

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`sign`](../interfaces/Custodian.md#sign)

***

### submitAndWait()

> **submitAndWait**(`tx`, `ctx`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\>

Defined in: [custodians/local/local-signer.ts:221](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L221)

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

[XrpldSubmitError](XrpldSubmitError.md) if the transaction reaches a terminal
  failure (a non-`tesSUCCESS` engine result).

#### Implementation of

[`Custodian`](../interfaces/Custodian.md).[`submitAndWait`](../interfaces/Custodian.md#submitandwait)

***

### submitAsync()

> **submitAsync**(`tx`, `ctx`): `Promise`\<[`SubmissionHandle`](../interfaces/SubmissionHandle.md)\>

Defined in: [custodians/local/local-signer.ts:255](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L255)

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

> `static` **create**(`options`): [`LocalSigner`](LocalSigner.md)

Defined in: [custodians/local/local-signer.ts:98](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L98)

Build a signer from pre-constructed wallets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`LocalSignerCreateOptions`](../interfaces/LocalSignerCreateOptions.md) | The wallets and optional primary r-address. |

#### Returns

[`LocalSigner`](LocalSigner.md)

A signer holding the given wallets.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no wallets are given, or `primary` is not among them.

***

### fromEnv()

> `static` **fromEnv**(`options`?): [`LocalSigner`](LocalSigner.md)

Defined in: [custodians/local/local-signer.ts:123](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L123)

Build a signer from `XRPL_*_SEED` environment variables (one wallet per
seed). The primary defaults to the first seed in scan order.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | [`LocalSignerFromEnvOptions`](../interfaces/LocalSignerFromEnvOptions.md) | Optional primary r-address and environment source. |

#### Returns

[`LocalSigner`](LocalSigner.md)

A signer holding one wallet per discovered seed.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no matching seed variables are found.

***

### fromSeed()

> `static` **fromSeed**(`seed`): [`LocalSigner`](LocalSigner.md)

Defined in: [custodians/local/local-signer.ts:87](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L87)

Build a signer from a single seed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `seed` | `string` | The wallet seed (the caller's responsibility to source). |

#### Returns

[`LocalSigner`](LocalSigner.md)

A signer holding the one derived wallet.
