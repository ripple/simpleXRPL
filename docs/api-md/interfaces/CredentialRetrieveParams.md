# Interface: CredentialRetrieveParams

Defined in: [verticals/credential.types.ts:72](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L72)

Parameters for [Credential.retrieve](../classes/Credential.md#retrieve).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/credential.types.ts:82](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L82)

The holder (subject).

#### Default Value

```ts
The primary signer's account.
```

***

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:74](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L74)

The credential type.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/credential.types.ts:76](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L76)

The issuer r-address.
