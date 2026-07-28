# Interface: FeeIntent

Defined in: [domain/model.ts:79](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L79)

A normalized, optional fee intent. The public surface never takes raw drops;
each path translates this to its backend's fee model.

## Properties

### maxFeeDrops?

> `readonly` `optional` **maxFeeDrops**: `string`

Defined in: [domain/model.ts:84](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L84)

The maximum fee cap, in drops — the common contract across all paths.

***

### priority?

> `readonly` `optional` **priority**: `"low"` \| `"medium"` \| `"high"`

Defined in: [domain/model.ts:81](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L81)

Priority tier; backends that cannot honor it auto-price and warn.
