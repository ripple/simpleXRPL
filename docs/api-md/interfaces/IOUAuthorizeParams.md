# Interface: IOUAuthorizeParams

Defined in: [verticals/iou.types.ts:62](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L62)

Parameters for [IOU.authorize](../classes/IOU.md#authorize).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:64](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L64)

The holder's r-address being authorized.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
