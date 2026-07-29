# Interface: IOURetrieveParams

Defined in: [verticals/iou.types.ts:194](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L194)

Parameters for [IOU.retrieve](../classes/IOU.md#retrieve).

## Extends

- [`IOURef`](IOURef.md)

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:202](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L202)

The holder account to read from.

#### Default Value

```ts
The primary signer's account.
```

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/iou.types.ts:196](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L196)

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
