# Interface: XrpTransferOptions

Defined in: [src/verticals/xrp.ts:22](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/xrp.ts#L22)

Per-call options for [XRP.transfer](../classes/XRP.md#transfer).

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/verticals/xrp.ts:27](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/xrp.ts#L27)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [src/verticals/xrp.ts:24](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/xrp.ts#L24)

Source account; defaults to the primary signer's primary account.
