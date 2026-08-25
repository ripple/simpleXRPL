# Interface: TokenListParams

Defined in: [verticals/token.types.ts:216](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L216)

Parameters for [Token.list](../classes/Token.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/token.types.ts:228](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L228)

The account to query; defaults to the primary signer's account.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: `"issuer"` \| `"holder"`

Defined in: [verticals/token.types.ts:222](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L222)

List tokens the account `holder`s or `issuer`d.

#### Default Value

`'holder'`
