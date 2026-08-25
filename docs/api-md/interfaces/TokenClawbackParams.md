# Interface: TokenClawbackParams

Defined in: [verticals/token.types.ts:142](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L142)

Parameters for `Token.clawback`.

## Properties

### amount

> `readonly` **amount**: [`Amount`](Amount.md)

Defined in: [verticals/token.types.ts:146](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L146)

The MPT amount to claw back (its asset must be an MPT).

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/token.types.ts:144](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L144)

The holder whose balance is reclaimed to the issuer.
