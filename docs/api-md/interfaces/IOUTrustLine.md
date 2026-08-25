# Interface: IOUTrustLine

Defined in: [verticals/iou.types.ts:196](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L196)

A shaped trust line (from `account_lines`), the point-in-time IOU state.

## Properties

### authorized

> `readonly` **authorized**: `boolean`

Defined in: [verticals/iou.types.ts:212](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L212)

Whether the line is authorized (issuer authorized the holder).

***

### balance

> `readonly` **balance**: `string`

Defined in: [verticals/iou.types.ts:202](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L202)

The trust-line balance, from the queried account's perspective.

***

### currency

> `readonly` **currency**: `string`

Defined in: [verticals/iou.types.ts:198](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L198)

The currency ticker (hex codes decoded to ASCII where printable).

***

### frozen

> `readonly` **frozen**: `boolean`

Defined in: [verticals/iou.types.ts:210](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L210)

Whether the queried account has frozen this line.

***

### limit

> `readonly` **limit**: `string`

Defined in: [verticals/iou.types.ts:204](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L204)

The queried account's trust limit.

***

### limitPeer

> `readonly` **limitPeer**: `string`

Defined in: [verticals/iou.types.ts:206](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L206)

The counterparty's trust limit.

***

### noRipple

> `readonly` **noRipple**: `boolean`

Defined in: [verticals/iou.types.ts:208](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L208)

Whether rippling is disabled on this line (`no_ripple`).

***

### peer

> `readonly` **peer**: `string`

Defined in: [verticals/iou.types.ts:200](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L200)

The counterparty r-address (the issuer, when querying as `holder`).
