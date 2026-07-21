# Interface: MptIssueFlags

Defined in: [src/verticals/token.types.ts:16](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L16)

Capability flags for an MPT issuance.

## Properties

### canClawback?

> `readonly` `optional` **canClawback**: `boolean`

Defined in: [src/verticals/token.types.ts:28](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L28)

The issuer can claw back the token.

***

### canEscrow?

> `readonly` `optional` **canEscrow**: `boolean`

Defined in: [src/verticals/token.types.ts:22](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L22)

The token can be used in escrows.

***

### canLock?

> `readonly` `optional` **canLock**: `boolean`

Defined in: [src/verticals/token.types.ts:18](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L18)

The issuer can lock the token (globally or per-holder).

***

### canTrade?

> `readonly` `optional` **canTrade**: `boolean`

Defined in: [src/verticals/token.types.ts:24](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L24)

The token can be traded on the DEX.

***

### canTransfer?

> `readonly` `optional` **canTransfer**: `boolean`

Defined in: [src/verticals/token.types.ts:26](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L26)

The token can be transferred between holders.

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [src/verticals/token.types.ts:20](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/token.types.ts#L20)

Holders must be authorized before they can hold the token.
