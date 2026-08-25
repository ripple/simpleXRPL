# Interface: IOUClawbackParams

Defined in: [verticals/iou.types.ts:100](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L100)

Parameters for [IOU.clawback](../classes/IOU.md#clawback).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `string`

Defined in: [verticals/iou.types.ts:104](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L104)

The amount to claw back, as a decimal string.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:102](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L102)

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
