# Interface: AccountSetParams

Defined in: [verticals/account.types.ts:57](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L57)

Parameters for `Account.set`. Each flag is a named boolean (`true` enables,
`false` disables); combine with the non-flag fields freely. At least one
parameter must be provided.

A single `AccountSet` can enable at most one flag and disable at most one, so
toggling more than one flag in the same direction is rejected — call
`set()` once per such change.

## Properties

### clawbackEnabled?

> `readonly` `optional` **clawbackEnabled**: `boolean`

Defined in: [verticals/account.types.ts:62](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L62)

Permanently allow this issuer to claw back issued tokens.

***

### defaultRipple?

> `readonly` `optional` **defaultRipple**: `boolean`

Defined in: [verticals/account.types.ts:74](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L74)

Enable rippling on trust lines by default.

***

### disableMaster?

> `readonly` `optional` **disableMaster**: `boolean`

Defined in: [verticals/account.types.ts:66](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L66)

Permanently disable the master key pair.

***

### disallowXRP?

> `readonly` `optional` **disallowXRP**: `boolean`

Defined in: [verticals/account.types.ts:78](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L78)

Disallow incoming XRP payments (advisory).

***

### domain?

> `readonly` `optional` **domain**: `string`

Defined in: [verticals/account.types.ts:86](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L86)

The account domain (plain string; hex-encoded on the ledger).

***

### globalFreeze?

> `readonly` `optional` **globalFreeze**: `boolean`

Defined in: [verticals/account.types.ts:76](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L76)

Freeze all trust lines issued by this account.

***

### noFreeze?

> `readonly` `optional` **noFreeze**: `boolean`

Defined in: [verticals/account.types.ts:60](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L60)

Permanently give up the ability to freeze trust lines.

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [verticals/account.types.ts:70](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L70)

Require holders to be authorized before they can hold issued tokens.

***

### requireDest?

> `readonly` `optional` **requireDest**: `boolean`

Defined in: [verticals/account.types.ts:72](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L72)

Require a destination tag on incoming payments.

***

### tickSize?

> `readonly` `optional` **tickSize**: `number`

Defined in: [verticals/account.types.ts:84](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L84)

Tick size for offers (3–15, or 0 to disable).

***

### transferRate?

> `readonly` `optional` **transferRate**: `number`

Defined in: [verticals/account.types.ts:82](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L82)

Transfer fee for issued currencies, as a percentage (0.5 = 0.5%, 0–100).

***

### trustLineLocking?

> `readonly` `optional` **trustLineLocking**: `boolean`

Defined in: [verticals/account.types.ts:64](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L64)

Permanently allow trust-line locking.
