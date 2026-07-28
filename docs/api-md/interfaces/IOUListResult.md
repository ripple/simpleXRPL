# Interface: IOUListResult

Defined in: [verticals/iou.types.ts:221](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L221)

Result of [IOU.list](../classes/IOU.md#list): `ious[i]` corresponds to `data[i]`.

## Properties

### data

> `readonly` **data**: readonly [`IOUTrustLine`](IOUTrustLine.md)[]

Defined in: [verticals/iou.types.ts:225](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L225)

The shaped trust lines.

***

### ious

> `readonly` **ious**: readonly `string`[]

Defined in: [verticals/iou.types.ts:223](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L223)

The `iouID` of each line, composable into the write verbs.
