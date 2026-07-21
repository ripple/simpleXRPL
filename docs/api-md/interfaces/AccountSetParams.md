# Interface: AccountSetParams

Defined in: [src/verticals/account.types.ts:51](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L51)

Parameters for `Account.set`. Each flag is a named boolean (`true` enables,
`false` disables); combine with the non-flag fields freely. At least one
parameter must be provided.

A single `AccountSet` can enable at most one flag and disable at most one, so
toggling more than one flag in the same direction is rejected — call
`set()` once per such change.

## Properties

### clawbackEnabled?

> `readonly` `optional` **clawbackEnabled**: `boolean`

Defined in: [src/verticals/account.types.ts:56](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L56)

Permanently allow this issuer to claw back issued tokens.

***

### defaultRipple?

> `readonly` `optional` **defaultRipple**: `boolean`

Defined in: [src/verticals/account.types.ts:68](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L68)

Enable rippling on trust lines by default.

***

### disableMaster?

> `readonly` `optional` **disableMaster**: `boolean`

Defined in: [src/verticals/account.types.ts:60](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L60)

Permanently disable the master key pair.

***

### disallowXRP?

> `readonly` `optional` **disallowXRP**: `boolean`

Defined in: [src/verticals/account.types.ts:72](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L72)

Disallow incoming XRP payments (advisory).

***

### domain?

> `readonly` `optional` **domain**: `string`

Defined in: [src/verticals/account.types.ts:80](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L80)

The account domain (plain string; hex-encoded on the ledger).

***

### globalFreeze?

> `readonly` `optional` **globalFreeze**: `boolean`

Defined in: [src/verticals/account.types.ts:70](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L70)

Freeze all trust lines issued by this account.

***

### noFreeze?

> `readonly` `optional` **noFreeze**: `boolean`

Defined in: [src/verticals/account.types.ts:54](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L54)

Permanently give up the ability to freeze trust lines.

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [src/verticals/account.types.ts:64](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L64)

Require holders to be authorized before they can hold issued tokens.

***

### requireDest?

> `readonly` `optional` **requireDest**: `boolean`

Defined in: [src/verticals/account.types.ts:66](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L66)

Require a destination tag on incoming payments.

***

### tickSize?

> `readonly` `optional` **tickSize**: `number`

Defined in: [src/verticals/account.types.ts:78](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L78)

Tick size for offers (3–15, or 0 to disable).

***

### transferRate?

> `readonly` `optional` **transferRate**: `number`

Defined in: [src/verticals/account.types.ts:76](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L76)

Transfer fee for issued currencies, as a percentage (0.5 = 0.5%, 0–100).

***

### trustLineLocking?

> `readonly` `optional` **trustLineLocking**: `boolean`

Defined in: [src/verticals/account.types.ts:58](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L58)

Permanently allow trust-line locking.
