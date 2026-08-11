# Interface: FeeIntent

Defined in: [domain/model.ts:89](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L89)

A normalized, optional fee intent. The public surface never takes raw drops;
each path translates this to its backend's fee model.

## Properties

### maxFeeDrops?

> `readonly` `optional` **maxFeeDrops**: `string`

Defined in: [domain/model.ts:94](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L94)

The maximum fee cap, in drops — the common contract across all paths.

***

### priority?

> `readonly` `optional` **priority**: `"low"` \| `"medium"` \| `"high"`

Defined in: [domain/model.ts:91](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L91)

Priority tier; backends that cannot honor it auto-price and warn.
