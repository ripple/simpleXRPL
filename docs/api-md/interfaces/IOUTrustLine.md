# Interface: IOUTrustLine

Defined in: [verticals/iou.types.ts:165](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L165)

A shaped trust line (from `account_lines`), the point-in-time IOU state.

## Properties

### authorized

> `readonly` **authorized**: `boolean`

Defined in: [verticals/iou.types.ts:181](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L181)

Whether the line is authorized (issuer authorized the holder).

***

### balance

> `readonly` **balance**: `string`

Defined in: [verticals/iou.types.ts:171](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L171)

The trust-line balance, from the queried account's perspective.

***

### currency

> `readonly` **currency**: `string`

Defined in: [verticals/iou.types.ts:167](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L167)

The currency ticker (hex codes decoded to ASCII where printable).

***

### frozen

> `readonly` **frozen**: `boolean`

Defined in: [verticals/iou.types.ts:179](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L179)

Whether the queried account has frozen this line.

***

### limit

> `readonly` **limit**: `string`

Defined in: [verticals/iou.types.ts:173](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L173)

The queried account's trust limit.

***

### limitPeer

> `readonly` **limitPeer**: `string`

Defined in: [verticals/iou.types.ts:175](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L175)

The counterparty's trust limit.

***

### noRipple

> `readonly` **noRipple**: `boolean`

Defined in: [verticals/iou.types.ts:177](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L177)

Whether rippling is disabled on this line (`no_ripple`).

***

### peer

> `readonly` **peer**: `string`

Defined in: [verticals/iou.types.ts:169](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L169)

The counterparty r-address (the issuer, when querying as `holder`).
