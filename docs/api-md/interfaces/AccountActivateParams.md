# Interface: AccountActivateParams

Defined in: [verticals/account.types.ts:26](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L26)

Parameters for `Account.activate` (operator-funded activation).

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [verticals/account.types.ts:30](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L30)

XRP to send; defaults to the network's base reserve.

***

### destination

> `readonly` **destination**: `string`

Defined in: [verticals/account.types.ts:28](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/verticals/account.types.ts#L28)

The r-address to activate (typically from `Account.create`).
