# Interface: CredentialIssueParams

Defined in: [src/verticals/credential.types.ts:13](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.types.ts#L13)

Parameters for `Credential.issue` (issued by the source account).

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [src/verticals/credential.types.ts:17](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.types.ts#L17)

The credential type (plain string; hex-encoded on the ledger).

***

### destination

> `readonly` **destination**: `string`

Defined in: [src/verticals/credential.types.ts:15](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.types.ts#L15)

The destination (holder) r-address the credential is about.

***

### expiration?

> `readonly` `optional` **expiration**: `number`

Defined in: [src/verticals/credential.types.ts:19](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.types.ts#L19)

Expiration (seconds since the Ripple epoch).

***

### URI?

> `readonly` `optional` **URI**: `string`

Defined in: [src/verticals/credential.types.ts:21](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.types.ts#L21)

An optional URI (plain string; hex-encoded on the ledger).
