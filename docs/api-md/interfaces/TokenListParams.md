# Interface: TokenListParams

Defined in: [verticals/token.types.ts:190](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L190)

Parameters for [Token.list](../classes/Token.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/token.types.ts:194](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L194)

The account to query; defaults to the primary signer's account.

***

### role?

> `readonly` `optional` **role**: `"issuer"` \| `"holder"`

Defined in: [verticals/token.types.ts:192](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L192)

List tokens the account `holder`s (default) or `issuer`d.
