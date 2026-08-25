# Interface: XrpWriteOptions

Defined in: [verticals/xrp.ts:58](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L58)

Source account and fee overrides shared by the XRP offer operations. The
resolved account signs the `OfferCreate`/`OfferCancel`.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [verticals/xrp.ts:63](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L63)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [verticals/xrp.ts:60](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L60)

Source account; defaults to the primary signer's primary account.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [verticals/xrp.ts:71](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L71)

A prior submission's `idempotencyKey` (from its result) so a retry resolves
to the same submission instead of duplicating it. How completely this
de-duplicates is set by the backend — see the note on the result's
`idempotencyKey`. Auto-generated when omitted.
