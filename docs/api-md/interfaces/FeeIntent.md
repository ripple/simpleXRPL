# Interface: FeeIntent

Defined in: [domain/model.ts:86](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L86)

A normalized, optional fee intent. The public surface never takes raw drops;
each path translates this to its backend's fee model.

## Properties

### maxFeeDrops?

> `readonly` `optional` **maxFeeDrops**: `string`

Defined in: [domain/model.ts:91](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L91)

The maximum fee cap, in drops — the common contract across all paths.

***

### priority?

> `readonly` `optional` **priority**: `"low"` \| `"medium"` \| `"high"`

Defined in: [domain/model.ts:88](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L88)

Priority tier; backends that cannot honor it auto-price and warn.
