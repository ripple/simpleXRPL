# Interface: TokenListParams

Defined in: [verticals/token.types.ts:214](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L214)

Parameters for [Token.list](../classes/Token.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/token.types.ts:226](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L226)

The account to query; defaults to the primary signer's account.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: `"issuer"` \| `"holder"`

Defined in: [verticals/token.types.ts:220](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L220)

List tokens the account `holder`s or `issuer`d.

#### Default Value

`'holder'`
