# Interface: MptFlags

Defined in: [verticals/token.types.ts:130](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L130)

An MPT issuance's capability flags, decoded to booleans.

## Properties

### canClawback

> `readonly` **canClawback**: `boolean`

Defined in: [verticals/token.types.ts:142](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L142)

The issuer can claw back the token.

***

### canEscrow

> `readonly` **canEscrow**: `boolean`

Defined in: [verticals/token.types.ts:136](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L136)

The token can be used in escrows.

***

### canLock

> `readonly` **canLock**: `boolean`

Defined in: [verticals/token.types.ts:132](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L132)

The issuer can lock the token.

***

### canTrade

> `readonly` **canTrade**: `boolean`

Defined in: [verticals/token.types.ts:138](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L138)

The token can be traded on the DEX.

***

### canTransfer

> `readonly` **canTransfer**: `boolean`

Defined in: [verticals/token.types.ts:140](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L140)

The token can be transferred between holders.

***

### requireAuth

> `readonly` **requireAuth**: `boolean`

Defined in: [verticals/token.types.ts:134](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L134)

Holders must be authorized before holding.
