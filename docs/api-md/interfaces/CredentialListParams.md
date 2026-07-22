# Interface: CredentialListParams

Defined in: [verticals/credential.types.ts:88](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/credential.types.ts#L88)

Parameters for [Credential.list](../classes/Credential.md#list).

## Properties

### account?

> `readonly` `optional` **account**: `string`

Defined in: [verticals/credential.types.ts:92](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/credential.types.ts#L92)

The account whose credentials to list; defaults to the primary signer's.

***

### role?

> `readonly` `optional` **role**: [`CredentialRole`](../type-aliases/CredentialRole.md)

Defined in: [verticals/credential.types.ts:90](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/credential.types.ts#L90)

Query as `holder` (default) or `issuer`.
