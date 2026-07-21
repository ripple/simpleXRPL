# Interface: XrpTransferOptions

Defined in: [src/verticals/xrp.ts:22](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/xrp.ts#L22)

Per-call options for [XRP.transfer](../classes/XRP.md#transfer).

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/verticals/xrp.ts:27](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/xrp.ts#L27)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [src/verticals/xrp.ts:24](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/xrp.ts#L24)

Source account; defaults to the primary signer's primary account.
