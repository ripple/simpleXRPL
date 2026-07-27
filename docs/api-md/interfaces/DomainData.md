# Interface: DomainData

Defined in: [verticals/domain.types.ts:53](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/domain.types.ts#L53)

A shaped permissioned domain (from `ledger_entry` / `account_objects`).

## Properties

### credList

> `readonly` **credList**: readonly [`AcceptedCredential`](AcceptedCredential.md)[]

Defined in: [verticals/domain.types.ts:59](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/domain.types.ts#L59)

The credentials the domain accepts (credential types decoded from hex).

***

### domainID

> `readonly` **domainID**: `string`

Defined in: [verticals/domain.types.ts:55](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/domain.types.ts#L55)

The domain's on-chain id.

***

### owner

> `readonly` **owner**: `string`

Defined in: [verticals/domain.types.ts:57](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/domain.types.ts#L57)

The owning account's r-address.
