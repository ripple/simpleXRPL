# Class: SimpleXRPLClient

Defined in: [src/client/client.ts:41](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L41)

The runtime client. Binds a set of pre-constructed custodians to a network,
flattens their discovered accounts into a single address to custodian index,
and resolves the account a verb acts on. Constructed only via
[SimpleXRPLClient.init](SimpleXRPLClient.md#init) (or `SimpleXRPL.init`), never with `new`.

A client with no signers is fully usable for reads; every write path resolves
its custodian through the acted-on account at call time.

## Implements

- [`SubmissionHost`](../interfaces/SubmissionHost.md)

## Properties

### account

> `readonly` **account**: [`AccountVertical`](AccountVertical.md)

Defined in: [src/client/client.ts:67](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L67)

Account settings, regular key, and deposit preauthorization.

***

### credential

> `readonly` **credential**: [`Credential`](Credential.md)

Defined in: [src/client/client.ts:61](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L61)

On-ledger credentials (issue, accept, delete).

***

### domain

> `readonly` **domain**: [`Domain`](Domain.md)

Defined in: [src/client/client.ts:64](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L64)

Permissioned domains (create, update, delete).

***

### iou

> `readonly` **iou**: [`IOU`](IOU.md)

Defined in: [src/client/client.ts:55](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L55)

Issued-currency (IOU) verbs: issue, transfer, authorize, lock, offers.

***

### network

> `readonly` **network**: [`NetworkInfo`](../interfaces/NetworkInfo.md)

Defined in: [src/client/client.ts:43](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L43)

The network this client is bound to.

***

### primarySigner

> `readonly` **primarySigner**: `undefined` \| [`Custodian`](../interfaces/Custodian.md)

Defined in: [src/client/client.ts:49](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L49)

The default signer, used when a verb is called without an explicit account.

***

### signers

> `readonly` **signers**: readonly [`Custodian`](../interfaces/Custodian.md)[]

Defined in: [src/client/client.ts:46](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L46)

The registered custodians (0..N).

***

### token

> `readonly` **token**: [`Token`](Token.md)

Defined in: [src/client/client.ts:58](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L58)

Multi-Purpose Token (MPT) family and DEX offers.

***

### xrp

> `readonly` **xrp**: [`XRP`](XRP.md)

Defined in: [src/client/client.ts:52](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L52)

Native-XRP value transfers.

## Accessors

### accounts

#### Get Signature

> **get** **accounts**(): `ReadonlyMap`\<`string`, [`Account`](../interfaces/Account.md)\>

Defined in: [src/client/client.ts:100](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L100)

All discovered accounts, keyed by r-address.

##### Returns

`ReadonlyMap`\<`string`, [`Account`](../interfaces/Account.md)\>

The address to account index.

***

### ledger

#### Get Signature

> **get** **ledger**(): [`LedgerPort`](../interfaces/LedgerPort.md)

Defined in: [src/client/client.ts:110](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L110)

The ledger connection for reads, autofill, and Local/raw submission.
Created lazily from `network.rippledUrl` when none was injected.

##### Returns

[`LedgerPort`](../interfaces/LedgerPort.md)

The ledger port.

The shared ledger connection for autofill and Local/raw submission.

#### Implementation of

[`SubmissionHost`](../interfaces/SubmissionHost.md).[`ledger`](../interfaces/SubmissionHost.md#ledger)

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [src/client/client.ts:237](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L237)

Open the ledger connection (no-op for a ledger that manages its own).

#### Returns

`Promise`\<`void`\>

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [src/client/client.ts:242](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L242)

Close the ledger connection (no-op for a ledger that manages its own).

#### Returns

`Promise`\<`void`\>

***

### refreshAccounts()

> **refreshAccounts**(): `Promise`\<`void`\>

Defined in: [src/client/client.ts:171](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L171)

Re-discover every custodian's accounts and rebuild the index. New accounts
become addressable; accounts removed upstream are gone on next lookup.

#### Returns

`Promise`\<`void`\>

#### Throws

[AmbiguousAccountError](AmbiguousAccountError.md) if an r-address is claimed by two custodians.

***

### registerLocalAccount()

> **registerLocalAccount**(`seed`): [`Account`](../interfaces/Account.md)

Defined in: [src/client/client.ts:182](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L182)

Register a locally-signed account at runtime so subsequent verbs can act on
it. Used by `Account.create` to make a freshly generated account usable
(e.g. by `Account.fund` / `Account.activate`).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `seed` | `string` | The account seed to hold a `LocalSigner` for. |

#### Returns

[`Account`](../interfaces/Account.md)

The registered account.

#### Implementation of

[`SubmissionHost`](../interfaces/SubmissionHost.md).[`registerLocalAccount`](../interfaces/SubmissionHost.md#registerlocalaccount)

***

### requireSigner()

> **requireSigner**(): [`Custodian`](../interfaces/Custodian.md)

Defined in: [src/client/client.ts:227](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L227)

Return the primary signer, or throw if the client has none.

#### Returns

[`Custodian`](../interfaces/Custodian.md)

The primary signer.

#### Throws

[NoSignerError](NoSignerError.md) if no signer is configured.

***

### resolveAccount()

> **resolveAccount**(`selector`?): [`Account`](../interfaces/Account.md)

Defined in: [src/client/client.ts:199](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L199)

Resolve the account a verb acts on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `selector`? | [`AccountSelector`](../type-aliases/AccountSelector.md) | An address, an explicit address, or a signer/account pair. |

#### Returns

[`Account`](../interfaces/Account.md)

The resolved account.

#### Throws

[NoSignerError](NoSignerError.md) if no selector is given and no signer is configured.

#### Throws

[AccountNotFoundError](AccountNotFoundError.md) if the address is not registered, or the
  explicit `{ signer, account }` account is not one the signer owns.

#### Implementation of

[`SubmissionHost`](../interfaces/SubmissionHost.md).[`resolveAccount`](../interfaces/SubmissionHost.md#resolveaccount)

***

### init()

> `static` **init**(`config`): `Promise`\<[`SimpleXRPLClient`](SimpleXRPLClient.md)\>

Defined in: [src/client/client.ts:126](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/client/client.ts#L126)

Bind custodians to a network and discover their accounts. The only entry
point; the runtime client is never constructed via `new`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | [`SimpleXRPLConfig`](../interfaces/SimpleXRPLConfig.md) | Network endpoints and pre-constructed custodians. |

#### Returns

`Promise`\<[`SimpleXRPLClient`](SimpleXRPLClient.md)\>

A ready client.

#### Throws

[AmbiguousAccountError](AmbiguousAccountError.md) if an r-address is claimed by two custodians.
