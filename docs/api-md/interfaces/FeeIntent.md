# Interface: FeeIntent

Defined in: [domain/model.ts:99](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L99)

A normalized, optional fee intent. The public surface never takes raw drops;
each path translates this to its backend's fee model.

## Properties

### maxFeeDrops?

> `readonly` `optional` **maxFeeDrops**: `string`

Defined in: [domain/model.ts:104](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L104)

The maximum fee cap, in drops — the common contract across all paths.

***

### priority?

> `readonly` `optional` **priority**: `"low"` \| `"medium"` \| `"high"`

Defined in: [domain/model.ts:101](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L101)

Priority tier; backends that cannot honor it auto-price and warn.
