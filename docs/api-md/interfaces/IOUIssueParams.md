# Interface: IOUIssueParams

Defined in: [verticals/iou.types.ts:37](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L37)

Parameters for [IOU.issue](../classes/IOU.md#issue).

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [verticals/iou.types.ts:59](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L59)

How much of the new IOU the issuer distributes to the hot wallet as the
final step, so one call ends with value in circulation. Omit to set the
trust line up only and distribute later via [IOU.transfer](../classes/IOU.md#transfer) (e.g.
issuing in tranches). A positive decimal string.

***

### holder?

> `readonly` `optional` **holder**: `string`

Defined in: [verticals/iou.types.ts:52](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L52)

The hot-wallet (holder) r-address that extends trust to the issuer — a
client-owned account on any connector. When set, the issuer and holder are
resolved from the client's signers (so either can be custody-held), with
the issuer taken from [IOUWriteOptions.from](IOUWriteOptions.md#from) (default: the primary
signer). When omitted, both are bootstrapped from the `XRPL_ISSUER_SEED` /
`XRPL_HOT_WALLET_SEED` environment seeds (the local dev flow).

***

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L43)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
