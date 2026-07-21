# Interface: IOUIssueParams

Defined in: [src/verticals/iou.types.ts:2](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L2)

Parameters for [IOUVertical.issue](../classes/IOUVertical.md#issue).

## Properties

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:8](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L8)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
