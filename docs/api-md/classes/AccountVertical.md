# Class: AccountVertical

Defined in: [verticals/account.ts:50](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L50)

The Account vertical: account settings, regular key, and deposit preauth.
Named `AccountVertical` to avoid colliding with the `Account` record type;
reached as `client.account`.

## Constructors

### new AccountVertical()

> **new AccountVertical**(`host`): [`AccountVertical`](AccountVertical.md)

Defined in: [verticals/account.ts:58](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L58)

Construct the Account vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`AccountVertical`](AccountVertical.md)

## Methods

### activate()

> **activate**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/account.ts:151](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L151)

Activate a created account by sending it XRP from the operator (primary)
account, then enable rippling. The any-network counterpart to [fund](AccountVertical.md#fund);
the account must be signable by this client (e.g. from [create](AccountVertical.md#create)).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`AccountActivateParams`](../interfaces/AccountActivateParams.md) | The destination and optional XRP amount (default: base reserve). |
| `options`? | [`AccountWriteOptions`](../interfaces/AccountWriteOptions.md) | Fee override for the transactions. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The result of the `defaultRipple` settings change.

***

### create()

> **create**(): [`AccountCredentials`](../interfaces/AccountCredentials.md)

Defined in: [verticals/account.ts:72](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L72)

Generate a new XRPL keypair locally and register it so it can be funded and
used right away. Nothing is written to the ledger until the account is
funded; store the returned `seed` securely (it is the only way to control
the account). Use this only to mint an additional account outside of
`SimpleXRPL.init`.

#### Returns

[`AccountCredentials`](../interfaces/AccountCredentials.md)

The new account's address, public key, private key, and seed.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if key generation yields no seed.

***

### depositPreauth()

> **depositPreauth**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/account.ts:263](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L263)

Grant or revoke deposit preauthorization for another account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`DepositPreauthParams`](../interfaces/DepositPreauthParams.md) | The account to authorize or unauthorize. |
| `options`? | [`AccountWriteOptions`](../interfaces/AccountWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

***

### fund()

> **fund**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/account.ts:124](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L124)

Fund a created account via the network faucet (testnet/devnet), then enable
rippling (`defaultRipple`). The account must be one this client can sign for
(e.g. from [create](AccountVertical.md#create)).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`AccountFundParams`](../interfaces/AccountFundParams.md) | The destination address to fund. |
| `options`? | [`AccountWriteOptions`](../interfaces/AccountWriteOptions.md) | Fee override for the follow-up settings transaction. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The result of the `defaultRipple` settings change.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if the ledger exposes no faucet.

***

### listOffers()

> **listOffers**(`params`?): `Promise`\<[`ListOffersResult`](../interfaces/ListOffersResult.md)\>

Defined in: [verticals/account.ts:105](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L105)

List the open DEX offers placed by an account. No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params`? | [`AccountListOffersParams`](../interfaces/AccountListOffersParams.md) | The account (default: the primary signer's account). |

#### Returns

`Promise`\<[`ListOffersResult`](../interfaces/ListOffersResult.md)\>

The shaped offers (composable into `iou.buyOffer`/`sellOffer`).

***

### retrieve()

> **retrieve**(`params`?): `Promise`\<[`AccountRetrieveResult`](../interfaces/AccountRetrieveResult.md)\>

Defined in: [verticals/account.ts:93](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L93)

Read an account's on-chain state — XRP balance, sequence, owner count, and
flags. No signer required; pass `account` or default to the primary.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params`? | [`AccountRetrieveParams`](../interfaces/AccountRetrieveParams.md) | The account to read (default: the primary signer's account). |

#### Returns

`Promise`\<[`AccountRetrieveResult`](../interfaces/AccountRetrieveResult.md)\>

The point-in-time account snapshot.

***

### set()

> **set**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/account.ts:190](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L190)

Update account settings. Flags are named booleans (`true` enables, `false`
disables); `transferRate`, `tickSize`, and `domain` are set directly. At
least one parameter is required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`AccountSetParams`](../interfaces/AccountSetParams.md) | The settings to change. |
| `options`? | [`AccountWriteOptions`](../interfaces/AccountWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no parameter is given, or more than one
  flag is toggled in the same direction (an `AccountSet` limitation).

***

### setRegularKey()

> **setRegularKey**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/account.ts:235](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.ts#L235)

Set or remove the account's regular key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`SetRegularKeyParams`](../interfaces/SetRegularKeyParams.md) | The regular key to set; omit to remove it. |
| `options`? | [`AccountWriteOptions`](../interfaces/AccountWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.
