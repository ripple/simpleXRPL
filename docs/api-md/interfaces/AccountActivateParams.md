# Interface: AccountActivateParams

Defined in: [src/verticals/account.types.ts:26](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L26)

Parameters for `Account.activate` (operator-funded activation).

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [src/verticals/account.types.ts:30](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L30)

XRP to send; defaults to the network's base reserve.

***

### destination

> `readonly` **destination**: `string`

Defined in: [src/verticals/account.types.ts:28](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/account.types.ts#L28)

The r-address to activate (typically from `Account.create`).
