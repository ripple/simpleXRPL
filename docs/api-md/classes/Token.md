# Class: Token

Defined in: [src/verticals/token.ts:45](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L45)

The Token vertical: the Multi-Purpose Token (MPT) family and DEX offers.

## Constructors

### new Token()

> **new Token**(`host`): [`Token`](Token.md)

Defined in: [src/verticals/token.ts:53](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L53)

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

Defined in: [src/verticals/token.ts:129](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L129)

Opt the calling account in to hold an MPT issuance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptAuthorizeParams`](../interfaces/MptAuthorizeParams.md) | The issuance id. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### cancelOffer()

> **cancelOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

Defined in: [src/verticals/token.ts:307](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L307)

Cancel a standing offer.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`CancelOfferParams`](../interfaces/CancelOfferParams.md) | The sequence number of the offer to cancel. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

The submission result.

***

### createOffer()

> **createOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [src/verticals/token.ts:271](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L271)

Place an offer on the decentralized exchange.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`CreateOfferParams`](../interfaces/CreateOfferParams.md) | The amounts to give and receive, plus offer flags. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if either amount is an MPT.

***

### destroy()

> **destroy**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [src/verticals/token.ts:213](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L213)

Destroy an MPT issuance (only when no tokens are outstanding).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptDestroyParams`](../interfaces/MptDestroyParams.md) | The issuance id. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### grantHolder()

> **grantHolder**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [src/verticals/token.ts:157](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L157)

Issuer grants a specific holder permission to hold this MPT (allow-listing).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptHolderParams`](../interfaces/MptHolderParams.md) | The issuance id and the holder to authorize. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### issue()

> **issue**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`MptIssueIntent`](../interfaces/MptIssueIntent.md)\>\>

Defined in: [src/verticals/token.ts:93](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L93)

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
| `params` | [`MptIssueParams`](../interfaces/MptIssueParams.md) | Issuance settings (metadata required) and flag overrides. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`MptIssueIntent`](../interfaces/MptIssueIntent.md)\>\>

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

### lock()

> **lock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

Defined in: [src/verticals/token.ts:185](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L185)

Lock an MPT issuance, or a specific holder's balance when `holder` is given.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptLockParams`](../interfaces/MptLockParams.md) | The issuance id and optional holder. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### revokeHolder()

> **revokeHolder**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

Defined in: [src/verticals/token.ts:171](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L171)

Issuer revokes a specific holder's permission to hold this MPT.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptHolderParams`](../interfaces/MptHolderParams.md) | The issuance id and the holder to revoke. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### transfer()

> **transfer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `amount`: `string`; `to`: `string`; \}\>\>

Defined in: [src/verticals/token.ts:239](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L239)

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

Defined in: [src/verticals/token.ts:143](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L143)

Opt the calling account out of holding an MPT issuance (balance must be 0).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptAuthorizeParams`](../interfaces/MptAuthorizeParams.md) | The issuance id. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `mptIssuanceId`: `string`; \}\>\>

The submission result.

***

### unlock()

> **unlock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

Defined in: [src/verticals/token.ts:199](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.ts#L199)

Unlock a previously locked MPT issuance or holder balance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`MptLockParams`](../interfaces/MptLockParams.md) | The issuance id and optional holder. |
| `options`? | [`TokenWriteOptions`](../interfaces/TokenWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `locked`: `boolean`; `mptIssuanceId`: `string`; \}\>\>

The submission result.
