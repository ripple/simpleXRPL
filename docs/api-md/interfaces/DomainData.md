# Interface: DomainData

Defined in: [verticals/domain.types.ts:55](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L55)

A shaped permissioned domain (from `ledger_entry` / `account_objects`).

## Properties

### credList

> `readonly` **credList**: readonly [`AcceptedCredential`](AcceptedCredential.md)[]

Defined in: [verticals/domain.types.ts:61](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L61)

The credentials the domain accepts (credential types decoded from hex).

***

### domainID

> `readonly` **domainID**: `string`

Defined in: [verticals/domain.types.ts:57](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L57)

The domain's on-chain id.

***

### owner

> `readonly` **owner**: `string`

Defined in: [verticals/domain.types.ts:59](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L59)

The owning account's r-address.
