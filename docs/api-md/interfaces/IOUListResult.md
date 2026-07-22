# Interface: IOUListResult

Defined in: [verticals/iou.types.ts:205](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L205)

Result of [IOU.list](../classes/IOU.md#list): `ious[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`IOUTrustLine`](IOUTrustLine.md)[]

Defined in: [verticals/iou.types.ts:209](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L209)

The shaped trust lines.

***

### ious

> `readonly` **ious**: readonly `string`[]

Defined in: [verticals/iou.types.ts:207](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L207)

The `iouID` of each line, composable into the write verbs.
