# Interface: IOUIssueParams

Defined in: [src/verticals/iou.types.ts:31](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L31)

Parameters for [IOU.issue](../classes/IOU.md#issue).

## Properties

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:37](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L37)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
