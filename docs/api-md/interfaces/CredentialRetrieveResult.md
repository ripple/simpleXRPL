# Interface: CredentialRetrieveResult

Defined in: [verticals/credential.types.ts:88](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L88)

Result of [Credential.retrieve](../classes/Credential.md#retrieve).

## Extends

- [`CredentialRef`](CredentialRef.md)

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:56](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L56)

The credential type.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`credType`](CredentialRef.md#credtype)

***

### data

> `readonly` **data**: `undefined` \| [`CredentialData`](CredentialData.md)

Defined in: [verticals/credential.types.ts:90](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L90)

The credential snapshot, or `undefined` if none exists.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/credential.types.ts:60](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L60)

The holder (subject) r-address.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`holder`](CredentialRef.md#holder)

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/credential.types.ts:58](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L58)

The issuer r-address.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`issuer`](CredentialRef.md#issuer)
