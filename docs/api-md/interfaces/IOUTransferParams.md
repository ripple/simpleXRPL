# Interface: IOUTransferParams

Defined in: [src/verticals/iou.types.ts:87](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L87)

Parameters for [IOU.transfer](../classes/IOU.md#transfer).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [src/verticals/iou.types.ts:91](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L91)

The amount to send.

***

### destination

> `readonly` **destination**: `string`

Defined in: [src/verticals/iou.types.ts:89](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L89)

The destination r-address.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
