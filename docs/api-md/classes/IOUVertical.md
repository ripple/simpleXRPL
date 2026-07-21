# Class: IOUVertical

Defined in: [src/verticals/iou.vertical.ts:11](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.vertical.ts#L11)

The `IOU` vertical entry point: issues new IOUs. Exposed as `client.iou`.
The returned [IOU](IOU.md) handle carries the remaining lifecycle methods
(`authorize`, `lock`, `unlock`, `clawback`, `transfer`, and DEX offers).

## Constructors

### new IOUVertical()

> **new IOUVertical**(`host`): [`IOUVertical`](IOUVertical.md)

Defined in: [src/verticals/iou.vertical.ts:19](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.vertical.ts#L19)

Construct the IOU vertical entry point.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`IOUVertical`](IOUVertical.md)

## Methods

### issue()

> **issue**(`params`): `Promise`\<[`IOU`](IOU.md)\>

Defined in: [src/verticals/iou.vertical.ts:29](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.vertical.ts#L29)

Issue a new IOU. See [IOU.issue](IOU.md#issue).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`IOUIssueParams`](../interfaces/IOUIssueParams.md) | The ticker to issue. |

#### Returns

`Promise`\<[`IOU`](IOU.md)\>

The issued IOU handle.
