# Type Alias: IOUOrderType

> **IOUOrderType**: `"limit"` \| `"market"` \| `"fok"` \| `"passive"`

Defined in: [src/verticals/iou.types.ts:82](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/iou.types.ts#L82)

How an offer is worked, per the API mapping's `token.buysell types` tab:
`limit` places the order untouched; `market` fills immediately or cancels;
`fok` fills completely or cancels; `passive` never crosses a matching offer.
