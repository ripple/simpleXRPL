# Interface: IOUTransferParams

Defined in: [verticals/iou.types.ts:93](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L93)

Parameters for [IOU.transfer](../classes/IOU.md#transfer).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [verticals/iou.types.ts:97](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L97)

The amount to send.

***

### destination

> `readonly` **destination**: `string`

Defined in: [verticals/iou.types.ts:95](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L95)

The destination r-address.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
