# Interface: IOULockParams

Defined in: [src/verticals/iou.types.ts:59](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L59)

Parameters for [IOU.lock](../classes/IOU.md#lock) and [IOU.unlock](../classes/IOU.md#unlock).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### holder

> `readonly` **holder**: `string`

Defined in: [src/verticals/iou.types.ts:61](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L61)

The holder's r-address whose trust line is (un)locked.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [src/verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
