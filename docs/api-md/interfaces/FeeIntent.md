# Interface: FeeIntent

Defined in: [src/domain/model.ts:75](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L75)

A normalized, optional fee intent. The public surface never takes raw drops;
each path translates this to its backend's fee model.

## Properties

### maxFeeDrops?

> `readonly` `optional` **maxFeeDrops**: `string`

Defined in: [src/domain/model.ts:80](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L80)

The maximum fee cap, in drops — the common contract across all paths.

***

### priority?

> `readonly` `optional` **priority**: `"low"` \| `"medium"` \| `"high"`

Defined in: [src/domain/model.ts:77](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L77)

Priority tier; backends that cannot honor it auto-price and warn.
