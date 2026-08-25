# Class: SimpleXRPLClient

Defined in: [client/client.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L43)

The runtime client. Binds a set of pre-constructed custodians to a network,
flattens their discovered accounts into a single address to custodian index,
and resolves the account an operation acts on. Constructed only via
[SimpleXRPLClient.init](SimpleXRPLClient.md#init) (or `SimpleXRPL.init`), never with `new`.

A client with no signers is fully usable for reads; every write path resolves
its custodian through the acted-on account at call time.

## Implements

- [`SubmissionHost`](../interfaces/SubmissionHost.md)

## Properties

### account

> `readonly` **account**: [`AccountVertical`](AccountVertical.md)

Defined in: [client/client.ts:69](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L69)

Account settings, regular key, and deposit preauthorization.

***

### credential

> `readonly` **credential**: [`Credential`](Credential.md)

Defined in: [client/client.ts:63](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L63)

On-ledger credentials (issue, accept, delete).

***

### domain

> `readonly` **domain**: [`Domain`](Domain.md)

Defined in: [client/client.ts:66](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L66)

Permissioned domains (create, update, delete).

***

### intent

> `readonly` **intent**: [`IntentInspector`](IntentInspector.md)

Defined in: [client/client.ts:72](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L72)

Read-only observation of custodian governance intents (status/await).

***

### iou

> `readonly` **iou**: [`IOU`](IOU.md)

Defined in: [client/client.ts:57](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L57)

Issued-currency (IOU) operations: issue, transfer, authorize, lock, offers.

***

### network

> `readonly` **network**: [`NetworkInfo`](../interfaces/NetworkInfo.md)

Defined in: [client/client.ts:45](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L45)

The network this client is bound to.

***

### pollMptIssuanceId

> `readonly` **pollMptIssuanceId**: `undefined` \| (`intentId`) => `Promise`\<`string`\>

Defined in: [client/client.ts:79](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L79)

Poll the Ripple Custody transaction layer until the on-chain transaction
linked to `intentId` is confirmed, then return its MPT issuance ID.
`undefined` when the primary signer is not a Ripple Custody instance.

#### Implementation of

[`SubmissionHost`](../interfaces/SubmissionHost.md).[`pollMptIssuanceId`](../interfaces/SubmissionHost.md#pollmptissuanceid)

***

### primarySigner

> `readonly` **primarySigner**: `undefined` \| [`Custodian`](../interfaces/Custodian.md)

Defined in: [client/client.ts:51](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L51)

The default signer, used when an operation is called without an explicit account.

***

### signers

> `readonly` **signers**: readonly [`Custodian`](../interfaces/Custodian.md)[]

Defined in: [client/client.ts:48](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L48)

The registered custodians (0..N).

***

### token

> `readonly` **token**: [`Token`](Token.md)

Defined in: [client/client.ts:60](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L60)

Multi-Purpose Token (MPT) family and DEX offers.

***

### xrp

> `readonly` **xrp**: [`XRP`](XRP.md)

Defined in: [client/client.ts:54](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L54)

Native-XRP value transfers.

## Accessors

### accounts

#### Get Signature

> **get** **accounts**(): `ReadonlyMap`\<`string`, [`Account`](../interfaces/Account.md)\>

Defined in: [client/client.ts:119](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L119)

All discovered accounts, keyed by r-address.

##### Returns

`ReadonlyMap`\<`string`, [`Account`](../interfaces/Account.md)\>

The address to account index.

***

### ledger

#### Get Signature

> **get** **ledger**(): [`LedgerPort`](../interfaces/LedgerPort.md)

Defined in: [client/client.ts:129](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L129)

The ledger connection for reads, autofill, and Local/raw submission.
Created lazily from `network.xrpldUrl` when none was injected.

##### Returns

[`LedgerPort`](../interfaces/LedgerPort.md)

The ledger port.

The shared ledger connection for autofill and Local/raw submission.

#### Implementation of

[`SubmissionHost`](../interfaces/SubmissionHost.md).[`ledger`](../interfaces/SubmissionHost.md#ledger)

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [client/client.ts:272](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L272)

Open the ledger connection. Optional — the ledger connects lazily on first
use (reads, autofill, submission), so most callers never need to call this;
it's useful only to pre-warm the connection. Idempotent.

#### Returns

`Promise`\<`void`\>

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [client/client.ts:277](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L277)

Close the ledger connection (no-op for a ledger that manages its own).

#### Returns

`Promise`\<`void`\>

***

### primaryAddress()

> **primaryAddress**(): `undefined` \| `string`

Defined in: [client/client.ts:216](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L216)

The primary signer's account address, or `undefined` on a no-signer client.
Read methods use this as the default account to query; it never throws, so
reads stay available without credentials (the caller passes an address).

#### Returns

`undefined` \| `string`

The primary account's r-address, or `undefined`.

#### Implementation of

[`SubmissionHost`](../interfaces/SubmissionHost.md).[`primaryAddress`](../interfaces/SubmissionHost.md#primaryaddress)

***

### refreshAccounts()

> **refreshAccounts**(): `Promise`\<`void`\>

Defined in: [client/client.ts:192](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L192)

Re-discover every custodian's accounts and rebuild the index. New accounts
become addressable; accounts removed upstream are gone on next lookup.

#### Returns

`Promise`\<`void`\>

#### Throws

[AmbiguousAccountError](AmbiguousAccountError.md) if an r-address is claimed by two custodians.

***

### registerLocalAccount()

> **registerLocalAccount**(`seed`): [`Account`](../interfaces/Account.md)

Defined in: [client/client.ts:203](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L203)

Register a locally-signed account at runtime so subsequent operations can act on
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

Defined in: [client/client.ts:258](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L258)

Return the primary signer, or throw if the client has none.

#### Returns

[`Custodian`](../interfaces/Custodian.md)

The primary signer.

#### Throws

[NoSignerError](NoSignerError.md) if no signer is configured.

***

### resolveAccount()

> **resolveAccount**(`selector`?): [`Account`](../interfaces/Account.md)

Defined in: [client/client.ts:230](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L230)

Resolve the account an operation acts on.

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

Defined in: [client/client.ts:146](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L146)

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

[DuplicateSignerError](DuplicateSignerError.md) if two signers share a kind and tenant id.

#### Throws

[AmbiguousAccountError](AmbiguousAccountError.md) if an r-address is claimed by two custodians.
