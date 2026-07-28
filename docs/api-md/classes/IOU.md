# Class: IOU

Defined in: [verticals/iou.ts:57](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L57)

The IOU (trust-line currency) vertical, exposed as `client.iou`. Write verbs
act as the issuer ([IOUWriteOptions.from](../interfaces/IOUWriteOptions.md#from), default the primary signer);
reads take an explicit `account` or default to the primary. Callers name
their own counterparty (`holder`/`destination`) per call.

## Constructors

### new IOU()

> **new IOU**(`host`): [`IOU`](IOU.md)

Defined in: [verticals/iou.ts:65](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L65)

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

Defined in: [verticals/iou.ts:152](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L152)

Grant authorization for a holder to hold this IOU. Only meaningful when
the issuer's account has `asfRequireAuth` set.

There is no matching `unauthorize`: the underlying `tfSetfAuth` flag is
one-way and cannot be cleared once set. To reversibly block a trust line,
use [IOU.lock](IOU.md#lock) instead.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUAuthorizeParams`](../interfaces/IOUAuthorizeParams.md) | The IOU and the holder to authorize. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUAuthorizeIntent`](../interfaces/IOUAuthorizeIntent.md)\>\>

The submission result, with `{ holder }` as the intent output.

***

### buyOffer()

> **buyOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/iou.ts:303](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L303)

Place an order on the DEX to acquire more of this IOU.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUOfferParams`](../interfaces/IOUOfferParams.md) | The IOU, amount to buy, order type, and price offered. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### cancelOffer()

> **cancelOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

Defined in: [verticals/iou.ts:335](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L335)

Cancel a standing offer placed by this IOU's issuer.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUCancelOfferParams`](../interfaces/IOUCancelOfferParams.md) | The sequence number of the offer to cancel. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

The submission result, with `{ offerSequence }` as the intent
output.

***

### clawback()

> **clawback**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUClawbackIntent`](../interfaces/IOUClawbackIntent.md)\>\>

Defined in: [verticals/iou.ts:234](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L234)

Reclaim a holder's balance back to the issuer.

Verifies the issuer has `asfAllowTrustLineClawback` enabled first
(a ledger read), throwing a clear error if not — that flag can only be
enabled before the issuer owns any trust lines, offers, or other ledger
objects, which this SDK does not itself pre-check.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUClawbackParams`](../interfaces/IOUClawbackParams.md) | The IOU, holder, and amount to claw back. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUClawbackIntent`](../interfaces/IOUClawbackIntent.md)\>\>

The submission result, with `{ holder, amount }` as the intent
output.

***

### issue()

> **issue**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUIssueIntent`](../interfaces/IOUIssueIntent.md)\>\>

Defined in: [verticals/iou.ts:83](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L83)

Generate a new trust-line-based IOU between two developer-controlled
accounts sourced from the environment.

Unlike the other verbs, `issue` bootstraps both accounts from the
environment (`XRPL_ISSUER_SEED`, `XRPL_HOT_WALLET_SEED`): the issuer enables
rippling (`AccountSet`), then the hot wallet extends trust to the maximum
limit (`TrustSet`). No value exists yet — use [IOU.transfer](IOU.md#transfer) to send.

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

### list()

> **list**(`params`?): `Promise`\<[`IOUListResult`](../interfaces/IOUListResult.md)\>

Defined in: [verticals/iou.ts:119](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L119)

List every IOU trust line for an account. No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params`? | [`IOUListParams`](../interfaces/IOUListParams.md) | The role and optional account (default: primary signer's). |

#### Returns

`Promise`\<[`IOUListResult`](../interfaces/IOUListResult.md)\>

The `iouID`s and shaped trust lines, index-aligned.

***

### listOffers()

> **listOffers**(`params`): `Promise`\<[`ListOffersResult`](../interfaces/ListOffersResult.md)\>

Defined in: [verticals/iou.ts:130](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L130)

List all open offers in the market for this IOU (both sides), tagged
buy/sell relative to it. No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUListOffersParams`](../interfaces/IOUListOffersParams.md) | The IOU ticker and issuer to anchor the book on. |

#### Returns

`Promise`\<[`ListOffersResult`](../interfaces/ListOffersResult.md)\>

The shaped offers, composable into `buyOffer`/`sellOffer`.

***

### lock()

> **lock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

Defined in: [verticals/iou.ts:187](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L187)

Freeze a holder's ability to send and receive this IOU: Individual
Freeze followed by Deep Freeze.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOULockParams`](../interfaces/IOULockParams.md) | The IOU and the holder to lock. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

The last step's submission result, with `{ holder }` as the
intent output.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.

***

### retrieve()

> **retrieve**(`params`): `Promise`\<[`IOURetrieveResult`](../interfaces/IOURetrieveResult.md)\>

Defined in: [verticals/iou.ts:109](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L109)

Read a single IOU trust line (point-in-time). No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOURetrieveParams`](../interfaces/IOURetrieveParams.md) | The ticker, issuer, and optional holder account. |

#### Returns

`Promise`\<[`IOURetrieveResult`](../interfaces/IOURetrieveResult.md)\>

The `iouID` and the trust-line snapshot (or `undefined`).

***

### sellOffer()

> **sellOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/iou.ts:319](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L319)

Place an order on the DEX to sell this IOU.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUOfferParams`](../interfaces/IOUOfferParams.md) | The IOU, amount to sell, order type, and price wanted. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### transfer()

> **transfer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUTransferIntent`](../interfaces/IOUTransferIntent.md)\>\>

Defined in: [verticals/iou.ts:267](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L267)

Send a specified amount of this IOU to a destination account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUTransferParams`](../interfaces/IOUTransferParams.md) | The IOU, destination, and amount. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUTransferIntent`](../interfaces/IOUTransferIntent.md)\>\>

The submission result, with `{ destination, amount }` as the
intent output.

***

### unlock()

> **unlock**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

Defined in: [verticals/iou.ts:209](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.ts#L209)

Restore a holder's ability to send and receive this IOU: clears Deep
Freeze then Individual Freeze.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOULockParams`](../interfaces/IOULockParams.md) | The IOU and the holder to unlock. |
| `options`? | [`IOUWriteOptions`](../interfaces/IOUWriteOptions.md) | Issuer account, fee override, and idempotency key (see [IOUWriteOptions](../interfaces/IOUWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

The last step's submission result, with `{ holder }` as the
intent output.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.
