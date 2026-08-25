# Class: XRP

Defined in: [verticals/xrp.ts:126](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L126)

The XRP helper vertical: native-XRP value transfers.

## Constructors

### new XRP()

> **new XRP**(`host`): [`XRP`](XRP.md)

Defined in: [verticals/xrp.ts:134](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L134)

Construct the XRP vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`XRP`](XRP.md)

## Methods

### buyOffer()

> **buyOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/xrp.ts:174](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L174)

Place an order on the DEX to acquire XRP.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`XrpOfferParams`](../interfaces/XrpOfferParams.md) | The amount of XRP to buy, order type, and price offered. |
| `options`? | [`XrpWriteOptions`](../interfaces/XrpWriteOptions.md) | Source account, fee override, and idempotency key (see [XrpWriteOptions](../interfaces/XrpWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### cancelOffer()

> **cancelOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

Defined in: [verticals/xrp.ts:206](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L206)

Cancel a standing offer placed by the acting account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`XrpCancelOfferParams`](../interfaces/XrpCancelOfferParams.md) | The sequence number of the offer to cancel. |
| `options`? | [`XrpWriteOptions`](../interfaces/XrpWriteOptions.md) | Source account, fee override, and idempotency key (see [XrpWriteOptions](../interfaces/XrpWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `offerSequence`: `number`; \}\>\>

The submission result, with `{ offerSequence }` as the intent
output.

***

### sellOffer()

> **sellOffer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

Defined in: [verticals/xrp.ts:190](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L190)

Place an order on the DEX to sell XRP.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`XrpOfferParams`](../interfaces/XrpOfferParams.md) | The amount of XRP to sell, order type, and price wanted. |
| `options`? | [`XrpWriteOptions`](../interfaces/XrpWriteOptions.md) | Source account, fee override, and idempotency key (see [XrpWriteOptions](../interfaces/XrpWriteOptions.md)). |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<`undefined`\>\>

The submission result.

#### Throws

[IntentValidationError](IntentValidationError.md) if `params.price` is MPT-denominated.

***

### transfer()

> **transfer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`XrpTransferIntent`](../interfaces/XrpTransferIntent.md)\>\>

Defined in: [verticals/xrp.ts:145](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L145)

Send XRP from one account to another (a `Payment`).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`XrpTransferParams`](../interfaces/XrpTransferParams.md) | Destination and amount (XRP). |
| `options`? | [`XrpTransferOptions`](../interfaces/XrpTransferOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`XrpTransferIntent`](../interfaces/XrpTransferIntent.md)\>\>

The submission result, with `{ to, amount }` as the intent output.
