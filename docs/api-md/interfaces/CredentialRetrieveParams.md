# Interface: CredentialRetrieveParams

Defined in: [verticals/credential.types.ts:74](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L74)

Parameters for [Credential.retrieve](../classes/Credential.md#retrieve).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/credential.types.ts:84](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L84)

The holder (subject).

#### Default Value

```ts
The primary signer's account.
```

***

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:76](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L76)

The credential type.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/credential.types.ts:78](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L78)

The issuer r-address.
