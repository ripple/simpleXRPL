# Interface: CredentialListParams

Defined in: [verticals/credential.types.ts:94](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L94)

Parameters for [Credential.list](../classes/Credential.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/credential.types.ts:106](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L106)

The account whose credentials to list.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: [`CredentialRole`](../type-aliases/CredentialRole.md)

Defined in: [verticals/credential.types.ts:100](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L100)

Query as `holder` or `issuer`.

#### Default Value

`'holder'`
