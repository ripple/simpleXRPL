# Interface: XrpTransferOptions

Defined in: [verticals/xrp.ts:29](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L29)

Per-call options for [XRP.transfer](../classes/XRP.md#transfer).

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/xrp.ts:34](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L34)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/xrp.ts:31](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L31)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/xrp.ts:42](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L42)

A prior submission's `idempotencyKey` (from its result) so a retry resolves
to the same submission instead of duplicating it. How completely this
de-duplicates is set by the backend — see the note on the result's
`idempotencyKey`. Auto-generated when omitted.
