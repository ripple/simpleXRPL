# Interface: TokenIssueFlags

Defined in: [verticals/token.types.ts:28](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L28)

Capability flags for an MPT issuance. Every flag is optional; any flag left
unset takes the SDK default below (a fully capable, transferable token).
These capabilities are **permanent** once the issuance is created.

## Properties

### canClawback?

> `readonly` `optional` **canClawback**: `boolean`

Defined in: [verticals/token.types.ts:64](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L64)

The issuer can claw back the token.

#### Default Value

`true`

***

### canEscrow?

> `readonly` `optional` **canEscrow**: `boolean`

Defined in: [verticals/token.types.ts:46](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L46)

The token can be used in escrows.

#### Default Value

`true`

***

### canLock?

> `readonly` `optional` **canLock**: `boolean`

Defined in: [verticals/token.types.ts:34](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L34)

The issuer can lock the token (globally or per-holder).

#### Default Value

`true`

***

### canTrade?

> `readonly` `optional` **canTrade**: `boolean`

Defined in: [verticals/token.types.ts:52](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L52)

The token can be traded on the DEX.

#### Default Value

`true`

***

### canTransfer?

> `readonly` `optional` **canTransfer**: `boolean`

Defined in: [verticals/token.types.ts:58](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L58)

The token can be transferred between holders.

#### Default Value

`true`

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [verticals/token.types.ts:40](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.types.ts#L40)

Holders must be authorized before they can hold the token (allow-listing).

#### Default Value

`false`
