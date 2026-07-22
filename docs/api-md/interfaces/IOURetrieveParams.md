# Interface: IOURetrieveParams

Defined in: [verticals/iou.types.ts:181](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L181)

Parameters for [IOU.retrieve](../classes/IOU.md#retrieve).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:185](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L185)

The holder account to read from; defaults to the primary signer's account.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/iou.types.ts:183](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L183)

The IOU issuer's r-address.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
