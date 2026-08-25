# Class: Token

Defined in: [verticals/token.ts:41](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L41)

The Token vertical: the Multi-Purpose Token (MPT) family.

DEX offers are not exposed here: the MPT DEX amendment is not yet live
on-chain, so MPTs cannot be traded on the order book. XRP/IOU offers belong
to the IOU vertical (`client.iou.buyOffer`/`sellOffer`/`cancelOffer`).

## Constructors

### new Token()

> **new Token**(`host`): [`Token`](Token.md)

Defined in: [verticals/token.ts:49](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L49)

Construct the Token vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`Token`](Token.md)

## Methods

### authorize()

> **authorize**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:146](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L146)

Opt the calling account in to hold an MPT issuance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenAuthorizeParams`](../interfaces/TokenAuthorizeParams.md) | The issuance id. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### clawback()

> **clawback**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `amount`: `string`; `holder`: `string`; \}\>\>

Defined in: [verticals/token.ts:311](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L311)

Reclaim a holder's MPT balance back to the issuer.

Requires the issuance to have been created with `canClawback` (the SDK
default). The holder whose balance is reclaimed is named explicitly, and
the amount's asset must be an MPT.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenClawbackParams`](../interfaces/TokenClawbackParams.md) | The holder and MPT amount to claw back. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Issuer account, fee override, and idempotency key. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `amount`: `string`; `holder`: `string`; \}\>\>

The result, echoing `{ holder, amount }` as its intent output.

#### Throws

[IntentValidationError](IntentValidationError.md) if the amount's asset is not an MPT.

***

### destroy()

> **destroy**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:230](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L230)

Destroy an MPT issuance (only when no tokens are outstanding).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenDestroyParams`](../interfaces/TokenDestroyParams.md) | The issuance id. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### grantHolder()

> **grantHolder**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:174](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L174)

Issuer grants a specific holder permission to hold this MPT (allow-listing).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenHolderParams`](../interfaces/TokenHolderParams.md) | The issuance id and the holder to authorize. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### issue()

> **issue**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`TokenIssueIntent`](../interfaces/TokenIssueIntent.md)\>\>

Defined in: [verticals/token.ts:112](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L112)

Create a new MPT issuance.

Applies opinionated, overridable defaults so a bare `issue()` yields a
usable token: `assetScale` defaults to `2`, and the capability flags
default to a fully capable, transferable token — `canLock`, `canEscrow`,
`canTrade`, `canTransfer`, and `canClawback` are all enabled, while
`requireAuth` is off. Pass any flag explicitly to override it (e.g.
`{ flags: { canClawback: false } }`). MPT capability flags are permanent
once the issuance exists.

`metadata` is required and validated against the XLS-89 standard, so every
issuance is discoverable and properly described. Non-compliant metadata
throws an [IntentValidationError](IntentValidationError.md) before submission; call
[validateTokenMetadata](../functions/validateTokenMetadata.md) to check metadata ahead of time. See the
standard at
https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenIssueParams`](../interfaces/TokenIssueParams.md) | Issuance settings (metadata required) and flag overrides. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`TokenIssueIntent`](../interfaces/TokenIssueIntent.md)\>\>

The result, with the new `mptIssuanceId` as its intent output.

#### Example

```ts
await client.token.issue({
  metadata: {
    ticker: 'TBILL',              // A-Z/0-9, up to 6 chars
    name: 'Acme T-Bill Token',
    icon: 'https://acme.example/icon.png',
    asset_class: 'rwa',           // rwa | memes | wrapped | gaming | defi | other
    asset_subclass: 'treasury',   // required when asset_class is 'rwa'
    issuer_name: 'Acme Inc',
  },
})
```

***

### list()

> **list**(`params`?): `Promise`\<[`TokenListResult`](../interfaces/TokenListResult.md)\>

Defined in: [verticals/token.ts:72](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L72)

List the MPTs an account holds (default) or issued. No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params`? | [`TokenListParams`](../interfaces/TokenListParams.md) | The role and account (default: the primary signer's). |

#### Returns

`Promise`\<[`TokenListResult`](../interfaces/TokenListResult.md)\>

The token ids and shaped entries, index-aligned.

***

### lock()

> **lock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:202](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L202)

Lock an MPT issuance, or a specific holder's balance when `holder` is given.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenLockParams`](../interfaces/TokenLockParams.md) | The issuance id and optional holder. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### retrieve()

> **retrieve**(`params`): `Promise`\<[`TokenRetrieveResult`](../interfaces/TokenRetrieveResult.md)\>

Defined in: [verticals/token.ts:60](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L60)

Retrieve a single MPT issuance by id (point-in-time), with flags decoded to
booleans and XLS-89 metadata decoded. No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenRetrieveParams`](../interfaces/TokenRetrieveParams.md) | The MPT issuance id to fetch. |

#### Returns

`Promise`\<[`TokenRetrieveResult`](../interfaces/TokenRetrieveResult.md)\>

The issuance id and snapshot (or `undefined` data if absent).

***

### revokeHolder()

> **revokeHolder**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:188](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L188)

Issuer revokes a specific holder's permission to hold this MPT.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenHolderParams`](../interfaces/TokenHolderParams.md) | The issuance id and the holder to revoke. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### transfer()

> **transfer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `amount`: `string`; `to`: `string`; \}\>\>

Defined in: [verticals/token.ts:274](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L274)

Send an MPT amount to another account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenTransferParams`](../interfaces/TokenTransferParams.md) | Destination and MPT amount. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `amount`: `string`; `to`: `string`; \}\>\>

The result, echoing the transfer as its intent output.

#### Throws

[IntentValidationError](IntentValidationError.md) if the amount's asset is not an MPT.

***

### unauthorize()

> **unauthorize**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:160](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L160)

Opt the calling account out of holding an MPT issuance (balance must be 0).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenAuthorizeParams`](../interfaces/TokenAuthorizeParams.md) | The issuance id. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### unlock()

> **unlock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

Defined in: [verticals/token.ts:216](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.ts#L216)

Unlock a previously locked MPT issuance or holder balance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`TokenLockParams`](../interfaces/TokenLockParams.md) | The issuance id and optional holder. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

The submission result.
