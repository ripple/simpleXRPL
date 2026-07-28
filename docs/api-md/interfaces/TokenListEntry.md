# Interface: TokenListEntry

Defined in: [verticals/token.types.ts:249](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L249)

An entry in [Token.list](../classes/Token.md#list): a full issuance (issuer) or a holding.

## Properties

### balance?

> `readonly` `optional` **balance**: `string`

Defined in: [verticals/token.types.ts:253](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L253)

The account's balance (present for `role: 'holder'`).

***

### issuance?

> `readonly` `optional` **issuance**: [`TokenData`](TokenData.md)

Defined in: [verticals/token.types.ts:255](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L255)

The full issuance snapshot (present for `role: 'issuer'`).

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:251](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/token.types.ts#L251)

The MPT issuance id.
