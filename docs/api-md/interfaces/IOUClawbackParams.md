# Interface: IOUClawbackParams

Defined in: [verticals/iou.types.ts:86](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L86)

Parameters for [IOU.clawback](../classes/IOU.md#clawback).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [verticals/iou.types.ts:90](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L90)

The amount to claw back.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:88](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L88)

The holder's r-address to claw the currency back from.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
