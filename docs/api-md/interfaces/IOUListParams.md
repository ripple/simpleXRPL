# Interface: IOUListParams

Defined in: [verticals/iou.types.ts:236](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L236)

Parameters for [IOU.list](../classes/IOU.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:248](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L248)

The account whose trust lines to list.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: [`IOURole`](../type-aliases/IOURole.md)

Defined in: [verticals/iou.types.ts:242](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L242)

Query as `holder` or `issuer`.

#### Default Value

`'holder'`
