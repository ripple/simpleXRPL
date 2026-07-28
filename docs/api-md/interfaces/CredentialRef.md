# Interface: CredentialRef

Defined in: [verticals/credential.types.ts:52](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L52)

Identifies a credential (all plain strings — never hex).

## Extended by

- [`CredentialData`](CredentialData.md)
- [`CredentialRetrieveResult`](CredentialRetrieveResult.md)

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:54](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L54)

The credential type.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/credential.types.ts:58](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L58)

The holder (subject) r-address.

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/credential.types.ts:56](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L56)

The issuer r-address.
