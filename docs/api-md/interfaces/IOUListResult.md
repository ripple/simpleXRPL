# Interface: IOUListResult

Defined in: [verticals/iou.types.ts:250](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L250)

Result of [IOU.list](../classes/IOU.md#list): `ious[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`IOUTrustLine`](IOUTrustLine.md)[]

Defined in: [verticals/iou.types.ts:254](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L254)

The shaped trust lines.

***

### ious

> `readonly` **ious**: readonly `string`[]

Defined in: [verticals/iou.types.ts:252](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L252)

The `iouID` of each line, composable into the write operations.
