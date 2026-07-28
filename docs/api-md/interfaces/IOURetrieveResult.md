# Interface: IOURetrieveResult

Defined in: [verticals/iou.types.ts:197](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L197)

Result of [IOU.retrieve](../classes/IOU.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`IOUTrustLine`](IOUTrustLine.md)

Defined in: [verticals/iou.types.ts:201](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L201)

The point-in-time trust-line snapshot, or `undefined` if no line exists.

***

### iouID

> `readonly` **iouID**: `string`

Defined in: [verticals/iou.types.ts:199](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L199)

Currency code and issuer, e.g. `USD.rIssuer...` — pass to write operations.
