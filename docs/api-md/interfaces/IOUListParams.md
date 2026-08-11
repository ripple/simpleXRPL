# Interface: IOUListParams

Defined in: [verticals/iou.types.ts:234](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L234)

Parameters for [IOU.list](../classes/IOU.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:246](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L246)

The account whose trust lines to list.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: [`IOURole`](../type-aliases/IOURole.md)

Defined in: [verticals/iou.types.ts:240](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L240)

Query as `holder` or `issuer`.

#### Default Value

`'holder'`
