# Class: IOU

Defined in: [src/verticals/iou.ts:64](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L64)

An issued IOU: the handle [IOUVertical.issue](IOUVertical.md#issue) returns, bound to one
issuer account and currency. Every instance method signs as that issuer —
the "hot wallet" account `issue` also sets up only receives the initial
trust line; it isn't a second signing identity later methods use. Callers
name their own counterparty (`holder`/`destination`) per call.

## Properties

### iouID

> `readonly` **iouID**: `string`

Defined in: [src/verticals/iou.ts:66](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L66)

Currency code and issuer of this IOU, e.g. `USD.rIssuer...`.

## Methods

### authorize()

> **authorize**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUAuthorizeIntent`](../interfaces/IOUAuthorizeIntent.md)\>\>

Defined in: [src/verticals/iou.ts:133](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L133)

Grant authorization for a holder to hold this IOU. Only meaningful when
the issuer's account has `asfRequireAuth` set.

There is no matching `unauthorize`: the underlying `tfSetfAuth` flag is
one-way and cannot be cleared once set. To reversibly block a trust line,
use [IOU.lock](IOU.md#lock) instead.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUAuthorizeParams`](../interfaces/IOUAuthorizeParams.md) | The holder to authorize. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUAuthorizeIntent`](../interfaces/IOUAuthorizeIntent.md)\>\>

The submission result, with `{ holder }` as the intent output.

***

### buyOffer()

> **buyOffer**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [src/verticals/iou.ts:281](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L281)

Place an order on the DEX to acquire more of this IOU.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUOfferParams`](../interfaces/IOUOfferParams.md) | The amount to buy, order type, and price offered. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### cancelOffer()

> **cancelOffer**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

Defined in: [src/verticals/iou.ts:307](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L307)

Cancel a standing offer placed by this IOU's issuer.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUCancelOfferParams`](../interfaces/IOUCancelOfferParams.md) | The sequence number of the offer to cancel. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

The submission result, with `{ offerSequence }` as the intent
output.

***

### clawback()

> **clawback**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUClawbackIntent`](../interfaces/IOUClawbackIntent.md)\>\>

Defined in: [src/verticals/iou.ts:224](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L224)

Reclaim a holder's balance back to the issuer.

Verifies the issuer has `asfAllowTrustLineClawback` enabled first
(a ledger read), throwing a clear error if not — that flag can only be
enabled before the issuer owns any trust lines, offers, or other ledger
objects, which this SDK does not itself pre-check.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUClawbackParams`](../interfaces/IOUClawbackParams.md) | The holder and amount to claw back. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUClawbackIntent`](../interfaces/IOUClawbackIntent.md)\>\>

The submission result, with `{ holder, amount }` as the intent
output.

***

### lock()

> **lock**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

Defined in: [src/verticals/iou.ts:162](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L162)

Freeze a holder's ability to send and receive this IOU: Individual
Freeze followed by Deep Freeze.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOULockParams`](../interfaces/IOULockParams.md) | The holder to lock. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

The last step's submission result, with `{ holder }` as the
intent output.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.

***

### sellOffer()

> **sellOffer**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [src/verticals/iou.ts:294](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L294)

Place an order on the DEX to sell this IOU.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUOfferParams`](../interfaces/IOUOfferParams.md) | The amount to sell, order type, and price wanted. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### transfer()

> **transfer**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUTransferIntent`](../interfaces/IOUTransferIntent.md)\>\>

Defined in: [src/verticals/iou.ts:251](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L251)

Send a specified amount of this IOU to a destination account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUTransferParams`](../interfaces/IOUTransferParams.md) | The destination and amount. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOUTransferIntent`](../interfaces/IOUTransferIntent.md)\>\>

The submission result, with `{ destination, amount }` as the
intent output.

***

### unlock()

> **unlock**(`params`): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

Defined in: [src/verticals/iou.ts:190](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L190)

Restore a holder's ability to send and receive this IOU: clears Deep
Freeze then Individual Freeze.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOULockParams`](../interfaces/IOULockParams.md) | The holder to unlock. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`IOULockIntent`](../interfaces/IOULockIntent.md)\>\>

The last step's submission result, with `{ holder }` as the
intent output.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.

***

### issue()

> `static` **issue**(`host`, `params`): `Promise`\<[`IOU`](IOU.md)\>

Defined in: [src/verticals/iou.ts:97](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.ts#L97)

Generate a new trust-line-based IOU between two developer-controlled
accounts sourced from the environment.

Reads `XRPL_ISSUER_SEED` and `XRPL_HOT_WALLET_SEED`: the issuer enables
rippling (`AccountSet`), then the hot wallet extends trust up to the
maximum allowable limit (`TrustSet`) — no `Payment` runs here, so no
value exists yet; use [IOU.transfer](IOU.md#transfer) to send some.

IOU tokens require additional off-chain configuration for reliable
display and interop — see https://xrplmeta.org/issuers/docs/self-publish.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |
| `params` | [`IOUIssueParams`](../interfaces/IOUIssueParams.md) | The ticker to issue. |

#### Returns

`Promise`\<[`IOU`](IOU.md)\>

The issued IOU handle.

#### Throws

[IntentValidationError](IntentValidationError.md) if the required seeds aren't set.

#### Throws

[MultiStepFailureError](MultiStepFailureError.md) if either step fails.
