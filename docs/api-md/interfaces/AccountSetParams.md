# Interface: AccountSetParams

Defined in: [verticals/account.types.ts:65](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L65)

Parameters for `Account.set`. Each flag is a named boolean (`true` enables,
`false` disables); combine with the non-flag fields freely. At least one
parameter must be provided.

A single `AccountSet` can enable at most one flag and disable at most one, so
toggling more than one flag in the same direction is rejected — call
`set()` once per such change.

Any field left unset is **left unchanged** on the account — omitting a flag
neither enables nor disables it; the SDK applies no defaults here.

## Properties

### clawbackEnabled?

> `readonly` `optional` **clawbackEnabled**: `boolean`

Defined in: [verticals/account.types.ts:70](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L70)

Permanently allow this issuer to claw back issued tokens.

***

### defaultRipple?

> `readonly` `optional` **defaultRipple**: `boolean`

Defined in: [verticals/account.types.ts:82](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L82)

Enable rippling on trust lines by default.

***

### disableMaster?

> `readonly` `optional` **disableMaster**: `boolean`

Defined in: [verticals/account.types.ts:74](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L74)

Permanently disable the master key pair.

***

### disallowXRP?

> `readonly` `optional` **disallowXRP**: `boolean`

Defined in: [verticals/account.types.ts:86](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L86)

Disallow incoming XRP payments (advisory).

***

### domain?

> `readonly` `optional` **domain**: `string`

Defined in: [verticals/account.types.ts:94](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L94)

The account domain (plain string; hex-encoded on the ledger).

***

### globalFreeze?

> `readonly` `optional` **globalFreeze**: `boolean`

Defined in: [verticals/account.types.ts:84](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L84)

Freeze all trust lines issued by this account.

***

### noFreeze?

> `readonly` `optional` **noFreeze**: `boolean`

Defined in: [verticals/account.types.ts:68](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L68)

Permanently give up the ability to freeze trust lines.

***

### requireAuth?

> `readonly` `optional` **requireAuth**: `boolean`

Defined in: [verticals/account.types.ts:78](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L78)

Require holders to be authorized before they can hold issued tokens.

***

### requireDest?

> `readonly` `optional` **requireDest**: `boolean`

Defined in: [verticals/account.types.ts:80](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L80)

Require a destination tag on incoming payments.

***

### tickSize?

> `readonly` `optional` **tickSize**: `number`

Defined in: [verticals/account.types.ts:92](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L92)

Tick size for offers (3–15, or 0 to disable).

***

### transferRate?

> `readonly` `optional` **transferRate**: `number`

Defined in: [verticals/account.types.ts:90](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L90)

Transfer fee for issued currencies, as a percentage (0.5 = 0.5%, 0–100).

***

### trustLineLocking?

> `readonly` `optional` **trustLineLocking**: `boolean`

Defined in: [verticals/account.types.ts:72](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/verticals/account.types.ts#L72)

Permanently allow trust-line locking.
