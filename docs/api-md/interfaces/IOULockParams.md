# Interface: IOULockParams

Defined in: [verticals/iou.types.ts:65](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L65)

Parameters for [IOU.lock](../classes/IOU.md#lock) and [IOU.unlock](../classes/IOU.md#unlock).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/iou.types.ts:67](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L67)

The holder's r-address whose trust line is (un)locked.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
