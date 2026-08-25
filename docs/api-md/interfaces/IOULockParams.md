# Interface: IOULockParams

Defined in: [verticals/iou.types.ts:88](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L88)

Parameters for [IOU.lock](../classes/IOU.md#lock) and [IOU.unlock](../classes/IOU.md#unlock).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:90](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L90)

The holder's r-address whose trust line is (un)locked.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
