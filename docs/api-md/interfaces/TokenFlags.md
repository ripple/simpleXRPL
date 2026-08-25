# Interface: TokenFlags

Defined in: [verticals/token.types.ts:154](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L154)

An MPT issuance's capability flags, decoded to booleans.

## Properties

### canClawback

> `readonly` **canClawback**: `boolean`

Defined in: [verticals/token.types.ts:166](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L166)

The issuer can claw back the token.

***

### canEscrow

> `readonly` **canEscrow**: `boolean`

Defined in: [verticals/token.types.ts:160](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L160)

The token can be used in escrows.

***

### canLock

> `readonly` **canLock**: `boolean`

Defined in: [verticals/token.types.ts:156](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L156)

The issuer can lock the token.

***

### canTrade

> `readonly` **canTrade**: `boolean`

Defined in: [verticals/token.types.ts:162](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L162)

The token can be traded on the DEX.

***

### canTransfer

> `readonly` **canTransfer**: `boolean`

Defined in: [verticals/token.types.ts:164](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L164)

The token can be transferred between holders.

***

### requireAuth

> `readonly` **requireAuth**: `boolean`

Defined in: [verticals/token.types.ts:158](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L158)

Holders must be authorized before holding.
