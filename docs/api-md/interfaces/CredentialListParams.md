# Interface: CredentialListParams

Defined in: [verticals/credential.types.ts:92](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L92)

Parameters for [Credential.list](../classes/Credential.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/credential.types.ts:104](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L104)

The account whose credentials to list.

#### Default Value

```ts
The primary signer's account.
```

***

### role?

> `readonly` `optional` **role**: [`CredentialRole`](../type-aliases/CredentialRole.md)

Defined in: [verticals/credential.types.ts:98](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L98)

Query as `holder` or `issuer`.

#### Default Value

`'holder'`
