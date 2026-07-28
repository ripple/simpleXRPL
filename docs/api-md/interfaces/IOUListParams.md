# Interface: IOUListParams

Defined in: [verticals/iou.types.ts:205](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L205)

Parameters for [IOU.list](../classes/IOU.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/iou.types.ts:217](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L217)

The account whose trust lines to list.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: [`IOURole`](../type-aliases/IOURole.md)

Defined in: [verticals/iou.types.ts:211](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L211)

Query as `holder` or `issuer`.

#### Default Value

`'holder'`
