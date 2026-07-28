# Interface: MptIssueFlags

Defined in: [verticals/token.types.ts:26](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L26)

Capability flags for an MPT issuance. Every flag is optional; any flag left
unset takes the SDK default below (a fully capable, transferable token).
These capabilities are **permanent** once the issuance is created.

## Properties

### canClawback?

> `readonly` `optional` **canClawback**: `boolean`

Defined in: [verticals/token.types.ts:62](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L62)

The issuer can claw back the token.

#### Default Value

`true`

***

### canEscrow?

> `readonly` `optional` **canEscrow**: `boolean`

Defined in: [verticals/token.types.ts:44](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L44)

The token can be used in escrows.

#### Default Value

`true`

***

### canLock?

> `readonly` `optional` **canLock**: `boolean`

Defined in: [verticals/token.types.ts:32](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L32)

The issuer can lock the token (globally or per-holder).

#### Default Value

`true`

***

### canTrade?

> `readonly` `optional` **canTrade**: `boolean`

Defined in: [verticals/token.types.ts:50](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L50)

The token can be traded on the DEX.

#### Default Value

`true`

***

### canTransfer?

> `readonly` `optional` **canTransfer**: `boolean`

Defined in: [verticals/token.types.ts:56](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L56)

The token can be transferred between holders.

#### Default Value

`true`

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [verticals/token.types.ts:38](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/token.types.ts#L38)

Holders must be authorized before they can hold the token (allow-listing).

#### Default Value

`false`
