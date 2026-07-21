# Interface: IOUIssueParams

Defined in: [src/verticals/iou.types.ts:31](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.types.ts#L31)

Parameters for [IOU.issue](../classes/IOU.md#issue).

## Properties

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:37](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/iou.types.ts#L37)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
