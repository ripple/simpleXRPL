# Interface: IOURetrieveResult

Defined in: [verticals/iou.types.ts:206](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L206)

Result of [IOU.retrieve](../classes/IOU.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`IOUTrustLine`](IOUTrustLine.md)

Defined in: [verticals/iou.types.ts:210](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L210)

The point-in-time trust-line snapshot, or `undefined` if no line exists.

***

### iouID

> `readonly` **iouID**: `string`

Defined in: [verticals/iou.types.ts:208](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L208)

Currency code and issuer, e.g. `USD.rIssuer...` — pass to write operations.
