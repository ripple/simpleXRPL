# Interface: IOUTrustLine

Defined in: [verticals/iou.types.ts:174](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L174)

A shaped trust line (from `account_lines`), the point-in-time IOU state.

## Properties

### authorized

> `readonly` **authorized**: `boolean`

Defined in: [verticals/iou.types.ts:190](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L190)

Whether the line is authorized (issuer authorized the holder).

***

### balance

> `readonly` **balance**: `string`

Defined in: [verticals/iou.types.ts:180](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L180)

The trust-line balance, from the queried account's perspective.

***

### currency

> `readonly` **currency**: `string`

Defined in: [verticals/iou.types.ts:176](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L176)

The currency ticker (hex codes decoded to ASCII where printable).

***

### frozen

> `readonly` **frozen**: `boolean`

Defined in: [verticals/iou.types.ts:188](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L188)

Whether the queried account has frozen this line.

***

### limit

> `readonly` **limit**: `string`

Defined in: [verticals/iou.types.ts:182](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L182)

The queried account's trust limit.

***

### limitPeer

> `readonly` **limitPeer**: `string`

Defined in: [verticals/iou.types.ts:184](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L184)

The counterparty's trust limit.

***

### noRipple

> `readonly` **noRipple**: `boolean`

Defined in: [verticals/iou.types.ts:186](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L186)

Whether rippling is disabled on this line (`no_ripple`).

***

### peer

> `readonly` **peer**: `string`

Defined in: [verticals/iou.types.ts:178](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L178)

The counterparty r-address (the issuer, when querying as `holder`).
