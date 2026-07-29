# Interface: IOUListParams

Defined in: [verticals/iou.types.ts:214](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L214)

Parameters for [IOU.list](../classes/IOU.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:226](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L226)

The account whose trust lines to list.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: [`IOURole`](../type-aliases/IOURole.md)

Defined in: [verticals/iou.types.ts:220](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L220)

Query as `holder` or `issuer`.

#### Default Value

`'holder'`
