# Class: XRP

Defined in: [verticals/xrp.ts:48](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/xrp.ts#L48)

The XRP helper vertical: native-XRP value transfers.

## Constructors

### new XRP()

> **new XRP**(`host`): [`XRP`](XRP.md)

Defined in: [verticals/xrp.ts:56](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/xrp.ts#L56)

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

Defined in: [verticals/xrp.ts:67](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/xrp.ts#L67)

Send XRP from one account to another (a `Payment`).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`XrpTransferParams`](../interfaces/XrpTransferParams.md) | Destination and amount (XRP). |
| `options`? | [`XrpTransferOptions`](../interfaces/XrpTransferOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`XrpTransferIntent`](../interfaces/XrpTransferIntent.md)\>\>

The submission result, with `{ to, amount }` as the intent output.
