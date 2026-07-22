# Interface: DomainSetCredentialsParams

Defined in: [verticals/domain.types.ts:33](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/domain.types.ts#L33)

Parameters for `Domain.setCredentials` (update an existing domain).

## Properties

### credList

> `readonly` **credList**: readonly [`AcceptedCredential`](AcceptedCredential.md)[]

Defined in: [verticals/domain.types.ts:37](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/domain.types.ts#L37)

The credentials the domain accepts (at least one).

***

### domain

> `readonly` **domain**: `string`

Defined in: [verticals/domain.types.ts:35](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/domain.types.ts#L35)

The domain to update.
