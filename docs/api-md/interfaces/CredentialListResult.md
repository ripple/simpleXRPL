# Interface: CredentialListResult

Defined in: [verticals/credential.types.ts:108](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L108)

Result of [Credential.list](../classes/Credential.md#list): `credentials[i]` corresponds to `data[i]`.

## Properties

### credentials

> `readonly` **credentials**: readonly [`CredentialRef`](CredentialRef.md)[]

Defined in: [verticals/credential.types.ts:110](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L110)

The identifier of each credential.

***

### data

> `readonly` **data**: readonly [`CredentialData`](CredentialData.md)[]

Defined in: [verticals/credential.types.ts:112](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L112)

The shaped credentials.
