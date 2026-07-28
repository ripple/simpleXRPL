# Interface: IOUIssueParams

Defined in: [verticals/iou.types.ts:37](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/iou.types.ts#L37)

Parameters for [IOU.issue](../classes/IOU.md#issue).

## Properties

### ticker

> `readonly` **ticker**: `string`

Defined in: [verticals/iou.types.ts:43](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/iou.types.ts#L43)

The currency code: a 3-character ISO-4217-style code or a 40-character
hex code. Any other code (e.g. a 5-character ticker) is auto-encoded to
the 40-character hex form.
