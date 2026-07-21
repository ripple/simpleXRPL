# Class: XRP

Defined in: [src/verticals/xrp.ts:42](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/xrp.ts#L42)

The XRP helper vertical: native-XRP value transfers.

## Constructors

### new XRP()

> **new XRP**(`host`): [`XRP`](XRP.md)

Defined in: [src/verticals/xrp.ts:50](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/xrp.ts#L50)

Construct the XRP vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`XRP`](XRP.md)

## Methods

### transfer()

> **transfer**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`XrpTransferIntent`](../interfaces/XrpTransferIntent.md)\>\>

Defined in: [src/verticals/xrp.ts:61](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/xrp.ts#L61)

Send XRP from one account to another (a `Payment`).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`XrpTransferParams`](../interfaces/XrpTransferParams.md) | Destination and amount (XRP). |
| `options`? | [`XrpTransferOptions`](../interfaces/XrpTransferOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`XrpTransferIntent`](../interfaces/XrpTransferIntent.md)\>\>

The submission result, with `{ to, amount }` as the intent output.
