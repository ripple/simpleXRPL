# Type Alias: IOUOrderType

> **IOUOrderType**: `"limit"` \| `"market"` \| `"fok"` \| `"passive"`

Defined in: [verticals/iou.types.ts:152](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/iou.types.ts#L152)

How an offer is worked, per the API mapping's `token.buysell types` tab:
`limit` places the order untouched; `market` fills immediately or cancels;
`fok` fills completely or cancels; `passive` never crosses a matching offer.
