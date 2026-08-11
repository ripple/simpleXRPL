# Interface: IOUIssueIntent

Defined in: [verticals/iou.types.ts:63](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L63)

Output attached to an [IOU.issue](../classes/IOU.md#issue) result.

## Properties

### amount?

> `readonly` `optional` **amount**: `string`

Defined in: [verticals/iou.types.ts:70](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L70)

The amount distributed to the hot wallet, or `undefined` when the issuance
only set the trust line up.

***

### iouID

> `readonly` **iouID**: `string`

Defined in: [verticals/iou.types.ts:65](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L65)

Currency code and issuer of the new IOU, e.g. `USD.rIssuer...`.
