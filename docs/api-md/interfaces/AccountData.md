# Interface: AccountData

Defined in: [verticals/account.types.ts:110](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L110)

A shaped account snapshot (from `account_info`).

## Properties

### address

> `readonly` **address**: `string`

Defined in: [verticals/account.types.ts:112](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L112)

The account's r-address.

***

### flags

> `readonly` **flags**: `Readonly`\<`Record`\<`string`, `boolean`\>\>

Defined in: [verticals/account.types.ts:120](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L120)

Account flags as booleans, as reported by `account_flags`.

***

### ownerCount

> `readonly` **ownerCount**: `number`

Defined in: [verticals/account.types.ts:118](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L118)

The number of owned ledger objects (drives the reserve).

***

### sequence

> `readonly` **sequence**: `number`

Defined in: [verticals/account.types.ts:116](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L116)

The account sequence number.

***

### xrpBalance

> `readonly` **xrpBalance**: `string`

Defined in: [verticals/account.types.ts:114](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L114)

The XRP balance (converted from drops).
