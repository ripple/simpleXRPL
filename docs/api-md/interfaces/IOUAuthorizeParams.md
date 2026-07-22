# Interface: IOUAuthorizeParams

Defined in: [verticals/iou.types.ts:53](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L53)

Parameters for [IOU.authorize](../classes/IOU.md#authorize).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:55](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L55)

The holder's r-address being authorized.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
