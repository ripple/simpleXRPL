# Interface: IOUClawbackParams

Defined in: [verticals/iou.types.ts:77](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/iou.types.ts#L77)

Parameters for [IOU.clawback](../classes/IOU.md#clawback).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [verticals/iou.types.ts:81](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/iou.types.ts#L81)

The amount to claw back.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:79](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/iou.types.ts#L79)

The holder's r-address to claw the currency back from.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
