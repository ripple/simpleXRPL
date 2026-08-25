# Interface: CredentialIssueParams

Defined in: [verticals/credential.types.ts:21](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L21)

Parameters for `Credential.issue` (issued by the source account).

## Properties

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:25](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L25)

The credential type (plain string; hex-encoded on the ledger).

***

### destination

> `readonly` **destination**: `string`

Defined in: [verticals/credential.types.ts:23](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L23)

The destination (holder) r-address the credential is about.

***

### expiration?

> `readonly` `optional` **expiration**: `number`

Defined in: [verticals/credential.types.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L27)

Expiration (seconds since the Ripple epoch).

***

### URI?

> `readonly` `optional` **URI**: `string`

Defined in: [verticals/credential.types.ts:29](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L29)

An optional URI (plain string; hex-encoded on the ledger).
