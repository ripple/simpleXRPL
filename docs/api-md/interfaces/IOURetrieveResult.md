# Interface: IOURetrieveResult

Defined in: [verticals/iou.types.ts:189](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L189)

Result of [IOU.retrieve](../classes/IOU.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`IOUTrustLine`](IOUTrustLine.md)

Defined in: [verticals/iou.types.ts:193](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L193)

The point-in-time trust-line snapshot, or `undefined` if no line exists.

***

### iouID

> `readonly` **iouID**: `string`

Defined in: [verticals/iou.types.ts:191](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L191)

Currency code and issuer, e.g. `USD.rIssuer...` — pass to write verbs.
