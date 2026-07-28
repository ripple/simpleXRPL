# Interface: MptFlags

Defined in: [verticals/token.types.ts:199](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L199)

An MPT issuance's capability flags, decoded to booleans.

## Properties

### canClawback

> `readonly` **canClawback**: `boolean`

Defined in: [verticals/token.types.ts:211](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L211)

The issuer can claw back the token.

***

### canEscrow

> `readonly` **canEscrow**: `boolean`

Defined in: [verticals/token.types.ts:205](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L205)

The token can be used in escrows.

***

### canLock

> `readonly` **canLock**: `boolean`

Defined in: [verticals/token.types.ts:201](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L201)

The issuer can lock the token.

***

### canTrade

> `readonly` **canTrade**: `boolean`

Defined in: [verticals/token.types.ts:207](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L207)

The token can be traded on the DEX.

***

### canTransfer

> `readonly` **canTransfer**: `boolean`

Defined in: [verticals/token.types.ts:209](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L209)

The token can be transferred between holders.

***

### requireAuth

> `readonly` **requireAuth**: `boolean`

Defined in: [verticals/token.types.ts:203](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L203)

Holders must be authorized before holding.
