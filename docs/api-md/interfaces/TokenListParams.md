# Interface: TokenListParams

Defined in: [verticals/token.types.ts:259](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L259)

Parameters for [Token.list](../classes/Token.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/token.types.ts:271](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L271)

The account to query; defaults to the primary signer's account.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: `"issuer"` \| `"holder"`

Defined in: [verticals/token.types.ts:265](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/token.types.ts#L265)

List tokens the account `holder`s or `issuer`d.

#### Default Value

`'holder'`
