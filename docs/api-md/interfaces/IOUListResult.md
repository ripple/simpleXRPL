# Interface: IOUListResult

Defined in: [verticals/iou.types.ts:230](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L230)

Result of [IOU.list](../classes/IOU.md#list): `ious[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`IOUTrustLine`](IOUTrustLine.md)[]

Defined in: [verticals/iou.types.ts:234](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L234)

The shaped trust lines.

***

### ious

> `readonly` **ious**: readonly `string`[]

Defined in: [verticals/iou.types.ts:232](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L232)

The `iouID` of each line, composable into the write operations.
