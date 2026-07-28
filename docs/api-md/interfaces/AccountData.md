# Interface: AccountData

Defined in: [verticals/account.types.ts:122](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.types.ts#L122)

A shaped account snapshot (from `account_info`).

## Properties

### address

> `readonly` **address**: `string`

Defined in: [verticals/account.types.ts:124](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.types.ts#L124)

The account's r-address.

***

### flags

> `readonly` **flags**: `Readonly`\<`Record`\<`string`, `boolean`\>\>

Defined in: [verticals/account.types.ts:132](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.types.ts#L132)

Account flags as booleans, as reported by `account_flags`.

***

### ownerCount

> `readonly` **ownerCount**: `number`

Defined in: [verticals/account.types.ts:130](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.types.ts#L130)

The number of owned ledger objects (drives the reserve).

***

### sequence

> `readonly` **sequence**: `number`

Defined in: [verticals/account.types.ts:128](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.types.ts#L128)

The account sequence number.

***

### xrpBalance

> `readonly` **xrpBalance**: `string`

Defined in: [verticals/account.types.ts:126](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/account.types.ts#L126)

The XRP balance (converted from drops).
