# Interface: DomainRetrieveResult

Defined in: [verticals/domain.types.ts:69](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L69)

Result of [Domain.retrieve](../classes/Domain.md#retrieve).

## Properties

### data

> `readonly` **data**: `undefined` \| [`DomainData`](DomainData.md)

Defined in: [verticals/domain.types.ts:73](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L73)

The domain snapshot, or `undefined` if no such domain exists.

***

### domainID

> `readonly` **domainID**: `string`

Defined in: [verticals/domain.types.ts:71](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/domain.types.ts#L71)

The queried domain id.
