# Class: IOU

Defined in: [src/verticals/iou.ts:51](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L51)

The IOU (trust-line currency) vertical, exposed as `client.iou`. Each verb
acts as the IOU's **issuer** — the account resolved from
[IOUWriteOptions.from](../interfaces/IOUWriteOptions.md#from) (default: the primary signer's account) signs,
and its address is the currency issuer. Callers name their own counterparty
(`holder`/`destination`) per call.

## Constructors

### new IOU()

> **new IOU**(`host`): [`IOU`](IOU.md)

Defined in: [src/verticals/iou.ts:59](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L59)

Construct the IOU vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`IOU`](IOU.md)

## Methods

### authorize()

> **authorize**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUAuthorizeIntent`](../interfaces/IOUAuthorizeIntent.md)\>\>

Defined in: [src/verticals/iou.ts:118](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L118)

Grant authorization for a holder to hold this IOU. Only meaningful when
the issuer's account has `asfRequireAuth` set.

There is no matching `unauthorize`: the underlying `tfSetfAuth` flag is
one-way and cannot be cleared once set. To reversibly block a trust line,
use [IOU.lock](IOU.md#lock) instead.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUAuthorizeParams`](../interfaces/IOUAuthorizeParams.md) | The IOU and the holder to authorize. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUAuthorizeIntent`](../interfaces/IOUAuthorizeIntent.md)\>\>

The submission result, with `{ holder }` as the intent output.

***

### buyOffer()

> **buyOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [src/verticals/iou.ts:261](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L261)

Place an order on the DEX to acquire more of this IOU.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUOfferParams`](../interfaces/IOUOfferParams.md) | The IOU, amount to buy, order type, and price offered. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### cancelOffer()

> **cancelOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

Defined in: [src/verticals/iou.ts:291](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L291)

Cancel a standing offer placed by this IOU's issuer.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUCancelOfferParams`](../interfaces/IOUCancelOfferParams.md) | The sequence number of the offer to cancel. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

The submission result, with `{ offerSequence }` as the intent
output.

***

### clawback()

> **clawback**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUClawbackIntent`](../interfaces/IOUClawbackIntent.md)\>\>

Defined in: [src/verticals/iou.ts:196](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L196)

Reclaim a holder's balance back to the issuer.

Verifies the issuer has `asfAllowTrustLineClawback` enabled first
(a ledger read), throwing a clear error if not — that flag can only be
enabled before the issuer owns any trust lines, offers, or other ledger
objects, which this SDK does not itself pre-check.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUClawbackParams`](../interfaces/IOUClawbackParams.md) | The IOU, holder, and amount to claw back. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUClawbackIntent`](../interfaces/IOUClawbackIntent.md)\>\>

The submission result, with `{ holder, amount }` as the intent
output.

***

### issue()

> **issue**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUIssueIntent`](../interfaces/IOUIssueIntent.md)\>\>

Defined in: [src/verticals/iou.ts:80](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L80)

Generate a new trust-line-based IOU between two developer-controlled
accounts sourced from the environment.

Unlike the other verbs, `issue` bootstraps both accounts from the
environment rather than [IOUWriteOptions.from](../interfaces/IOUWriteOptions.md#from): it reads
`XRPL_ISSUER_SEED` and `XRPL_HOT_WALLET_SEED`, has the issuer enable
rippling (`AccountSet`), then the hot wallet extends trust up to the
maximum allowable limit (`TrustSet`) — no `Payment` runs here, so no
value exists yet; use [IOU.transfer](IOU.md#transfer) to send some. IOU tokens need
off-chain config for display/interop (see xrplmeta self-publish docs).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUIssueParams`](../interfaces/IOUIssueParams.md) | The ticker to issue. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUIssueIntent`](../interfaces/IOUIssueIntent.md)\>\>

The result, with `{ iouID }` as its intent output.

#### Throws

[IntentValidationError](IntentValidationError.md) if the required seeds aren't set.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.

***

### lock()

> **lock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

Defined in: [src/verticals/iou.ts:151](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L151)

Freeze a holder's ability to send and receive this IOU: Individual
Freeze followed by Deep Freeze.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOULockParams`](../interfaces/IOULockParams.md) | The IOU and the holder to lock. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

The last step's submission result, with `{ holder }` as the
intent output.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.

***

### sellOffer()

> **sellOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [src/verticals/iou.ts:276](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L276)

Place an order on the DEX to sell this IOU.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUOfferParams`](../interfaces/IOUOfferParams.md) | The IOU, amount to sell, order type, and price wanted. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### transfer()

> **transfer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUTransferIntent`](../interfaces/IOUTransferIntent.md)\>\>

Defined in: [src/verticals/iou.ts:227](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L227)

Send a specified amount of this IOU to a destination account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUTransferParams`](../interfaces/IOUTransferParams.md) | The IOU, destination, and amount. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUTransferIntent`](../interfaces/IOUTransferIntent.md)\>\>

The submission result, with `{ destination, amount }` as the
intent output.

***

### unlock()

> **unlock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

Defined in: [src/verticals/iou.ts:172](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.ts#L172)

Restore a holder's ability to send and receive this IOU: clears Deep
Freeze then Individual Freeze.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOULockParams`](../interfaces/IOULockParams.md) | The IOU and the holder to unlock. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

The last step's submission result, with `{ holder }` as the
intent output.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.
