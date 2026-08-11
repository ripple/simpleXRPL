# Interface: IOURetrieveResult

Defined in: [verticals/iou.types.ts:226](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L226)

Result of [IOU.retrieve](../classes/IOU.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`IOUTrustLine`](IOUTrustLine.md)

Defined in: [verticals/iou.types.ts:230](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L230)

The point-in-time trust-line snapshot, or `undefined` if no line exists.

***

### iouID

> `readonly` **iouID**: `string`

Defined in: [verticals/iou.types.ts:228](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L228)

Currency code and issuer, e.g. `USD.rIssuer...` — pass to write operations.
