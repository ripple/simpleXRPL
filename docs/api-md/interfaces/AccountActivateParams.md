# Interface: AccountActivateParams

Defined in: [src/verticals/account.types.ts:26](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/account.types.ts#L26)

Parameters for `Account.activate` (operator-funded activation).

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [src/verticals/account.types.ts:30](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/account.types.ts#L30)

XRP to send; defaults to the network's base reserve.

***

### destination

> `readonly` **destination**: `string`

Defined in: [src/verticals/account.types.ts:28](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/verticals/account.types.ts#L28)

The r-address to activate (typically from `Account.create`).
