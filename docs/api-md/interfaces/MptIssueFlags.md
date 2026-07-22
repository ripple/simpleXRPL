# Interface: MptIssueFlags

Defined in: [verticals/token.types.ts:22](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L22)

Capability flags for an MPT issuance.

## Properties

### canClawback?

> `readonly` `optional` **canClawback**: `boolean`

Defined in: [verticals/token.types.ts:34](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L34)

The issuer can claw back the token.

***

### canEscrow?

> `readonly` `optional` **canEscrow**: `boolean`

Defined in: [verticals/token.types.ts:28](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L28)

The token can be used in escrows.

***

### canLock?

> `readonly` `optional` **canLock**: `boolean`

Defined in: [verticals/token.types.ts:24](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L24)

The issuer can lock the token (globally or per-holder).

***

### canTrade?

> `readonly` `optional` **canTrade**: `boolean`

Defined in: [verticals/token.types.ts:30](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L30)

The token can be traded on the DEX.

***

### canTransfer?

> `readonly` `optional` **canTransfer**: `boolean`

Defined in: [verticals/token.types.ts:32](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L32)

The token can be transferred between holders.

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [verticals/token.types.ts:26](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/token.types.ts#L26)

Holders must be authorized before they can hold the token.
