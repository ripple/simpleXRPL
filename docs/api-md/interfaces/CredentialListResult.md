# Interface: CredentialListResult

Defined in: [verticals/credential.types.ts:96](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/credential.types.ts#L96)

Result of [Credential.list](../classes/Credential.md#list): `credentials[i]` corresponds to `data[i]`.

## Properties

### credentials

> `readonly` **credentials**: readonly [`CredentialRef`](CredentialRef.md)[]

Defined in: [verticals/credential.types.ts:98](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/credential.types.ts#L98)

The identifier of each credential.

***

### data

> `readonly` **data**: readonly [`CredentialData`](CredentialData.md)[]

Defined in: [verticals/credential.types.ts:100](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/credential.types.ts#L100)

The shaped credentials.
