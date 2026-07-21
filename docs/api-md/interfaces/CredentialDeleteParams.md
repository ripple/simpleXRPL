# Interface: CredentialDeleteParams

Defined in: [src/verticals/credential.types.ts:33](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/credential.types.ts#L33)

Parameters for `Credential.delete` (by the issuer or the holder).

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [src/verticals/credential.types.ts:35](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/credential.types.ts#L35)

The credential type (plain string; hex-encoded on the ledger).

***

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [src/verticals/credential.types.ts:37](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/credential.types.ts#L37)

The holder r-address (set when deleting as the issuer).

***

### issuer?

> `readonly` `optional` **issuer**: `string`

Defined in: [src/verticals/credential.types.ts:39](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/credential.types.ts#L39)

The issuer r-address (set when deleting as the holder).
