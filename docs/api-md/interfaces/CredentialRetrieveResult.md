# Interface: CredentialRetrieveResult

Defined in: [verticals/credential.types.ts:86](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L86)

Result of [Credential.retrieve](../classes/Credential.md#retrieve).

## Extends

- [`CredentialRef`](CredentialRef.md)

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:54](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L54)

The credential type.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`credType`](CredentialRef.md#credtype)

***

### data

> `readonly` **data**: `undefined` \| [`CredentialData`](CredentialData.md)

Defined in: [verticals/credential.types.ts:88](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L88)

The credential snapshot, or `undefined` if none exists.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/credential.types.ts:58](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L58)

The holder (subject) r-address.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`holder`](CredentialRef.md#holder)

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/credential.types.ts:56](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/credential.types.ts#L56)

The issuer r-address.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`issuer`](CredentialRef.md#issuer)
