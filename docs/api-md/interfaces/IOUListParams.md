# Interface: IOUListParams

Defined in: [verticals/iou.types.ts:197](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L197)

Parameters for [IOU.list](../classes/IOU.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:201](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L201)

The account whose trust lines to list; defaults to the primary signer's.

***

### role?

> `readonly` `optional` **role**: [`IOURole`](../type-aliases/IOURole.md)

Defined in: [verticals/iou.types.ts:199](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L199)

Query as `holder` (default) or `issuer`.
