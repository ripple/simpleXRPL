# Interface: DomainSetCredentialsParams

Defined in: [verticals/domain.types.ts:33](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.types.ts#L33)

Parameters for `Domain.setCredentials` (update an existing domain).

## Properties

### credList

> `readonly` **credList**: readonly [`AcceptedCredential`](AcceptedCredential.md)[]

Defined in: [verticals/domain.types.ts:37](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.types.ts#L37)

The credentials the domain accepts (at least one).

***

### domain

> `readonly` **domain**: `string`

Defined in: [verticals/domain.types.ts:35](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.types.ts#L35)

The domain to update.
