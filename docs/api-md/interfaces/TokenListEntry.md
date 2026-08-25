# Interface: TokenListEntry

Defined in: [verticals/token.types.ts:204](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L204)

An entry in [Token.list](../classes/Token.md#list): a full issuance (issuer) or a holding.

## Properties

### balance?

> `readonly` `optional` **balance**: `string`

Defined in: [verticals/token.types.ts:208](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L208)

The account's balance (present for `role: 'holder'`).

***

### issuance?

> `readonly` `optional` **issuance**: [`TokenData`](TokenData.md)

Defined in: [verticals/token.types.ts:210](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L210)

The full issuance snapshot (present for `role: 'issuer'`).

***

### tokenID

> `readonly` **tokenID**: `string`

Defined in: [verticals/token.types.ts:206](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L206)

The MPT issuance id.
