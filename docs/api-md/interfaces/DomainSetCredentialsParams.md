# Interface: DomainSetCredentialsParams

Defined in: [src/verticals/domain.types.ts:27](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/domain.types.ts#L27)

Parameters for `Domain.setCredentials` (update an existing domain).

## Properties

### credList

> `readonly` **credList**: readonly [`AcceptedCredential`](AcceptedCredential.md)[]

Defined in: [src/verticals/domain.types.ts:31](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/domain.types.ts#L31)

The credentials the domain accepts (at least one).

***

### domain

> `readonly` **domain**: `string`

Defined in: [src/verticals/domain.types.ts:29](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/domain.types.ts#L29)

The domain to update.
