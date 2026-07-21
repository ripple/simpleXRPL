# Interface: AccountActivateParams

Defined in: [src/verticals/account.types.ts:26](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L26)

Parameters for `Account.activate` (operator-funded activation).

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [src/verticals/account.types.ts:30](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L30)

XRP to send; defaults to the network's base reserve.

***

### destination

> `readonly` **destination**: `string`

Defined in: [src/verticals/account.types.ts:28](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/account.types.ts#L28)

The r-address to activate (typically from `Account.create`).
