# Interface: CredentialDeleteParams

Defined in: [verticals/credential.types.ts:41](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L41)

Parameters for `Credential.delete` (by the issuer or the holder).

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L43)

The credential type (plain string; hex-encoded on the ledger).

***

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [verticals/credential.types.ts:45](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L45)

The holder r-address (set when deleting as the issuer).

***

### issuer?

> `readonly` `optional` **issuer**: `string`

Defined in: [verticals/credential.types.ts:47](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L47)

The issuer r-address (set when deleting as the holder).
