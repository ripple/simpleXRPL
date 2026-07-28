# Interface: CredentialDeleteParams

Defined in: [verticals/credential.types.ts:39](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L39)

Parameters for `Credential.delete` (by the issuer or the holder).

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:41](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L41)

The credential type (plain string; hex-encoded on the ledger).

***

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [verticals/credential.types.ts:43](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L43)

The holder r-address (set when deleting as the issuer).

***

### issuer?

> `readonly` `optional` **issuer**: `string`

Defined in: [verticals/credential.types.ts:45](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/credential.types.ts#L45)

The issuer r-address (set when deleting as the holder).
