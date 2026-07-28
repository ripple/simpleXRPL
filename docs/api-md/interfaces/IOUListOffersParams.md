# Interface: IOUListOffersParams

Defined in: [verticals/iou.types.ts:229](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L229)

Parameters for [IOU.listOffers](../classes/IOU.md#listoffers).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/iou.types.ts:231](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L231)

The IOU issuer's r-address.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)
