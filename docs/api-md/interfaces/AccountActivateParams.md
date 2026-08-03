# Interface: AccountActivateParams

Defined in: [verticals/account.types.ts:26](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L26)

Parameters for `Account.activate` (operator-funded activation).

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [verticals/account.types.ts:35](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L35)

XRP to send.

#### Default Value

The network's base reserve plus a small buffer (so the new
  account can afford its own follow-up `defaultRipple` transaction).

***

### destination

> `readonly` **destination**: `string`

Defined in: [verticals/account.types.ts:28](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/account.types.ts#L28)

The r-address to activate (typically from `Account.create`).
