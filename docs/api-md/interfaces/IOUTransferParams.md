# Interface: IOUTransferParams

Defined in: [verticals/iou.types.ts:116](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L116)

Parameters for [IOU.transfer](../classes/IOU.md#transfer).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### amount

> `readonly` **amount**: `string`

Defined in: [verticals/iou.types.ts:128](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L128)

The amount to send, as a decimal string (e.g. `'10'`, `'0.25'`).

A string, not a `number`, because that is what the ledger carries: an IOU
`value` is a string on the wire, and the XRPL IOU format spans a range no
IEEE754 double can address exactly. A computed `number` silently arrives
with artifacts — `0.1 + 0.2` becomes `0.30000000000000004`, 17 significant
digits against the IOU limit — so amounts are kept in decimal end to end.

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L14)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.

#### Inherited from

[`IOURef`](IOURef.md).[`ticker`](IOURef.md#ticker)

***

### to

> `readonly` **to**: `string`

Defined in: [verticals/iou.types.ts:118](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L118)

The destination r-address.
