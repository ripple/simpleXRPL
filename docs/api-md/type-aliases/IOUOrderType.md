# Type Alias: IOUOrderType

> **IOUOrderType**: `"limit"` \| `"market"` \| `"fok"` \| `"passive"`

Defined in: [src/verticals/iou.types.ts:117](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/iou.types.ts#L117)

How an offer is worked, per the API mapping's `token.buysell types` tab:
`limit` places the order untouched; `market` fills immediately or cancels;
`fok` fills completely or cancels; `passive` never crosses a matching offer.
