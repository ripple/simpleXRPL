# Type Alias: IOUOrderType

> **IOUOrderType**: `"limit"` \| `"market"` \| `"fok"` \| `"passive"`

Defined in: [verticals/iou.types.ts:123](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/verticals/iou.types.ts#L123)

How an offer is worked, per the API mapping's `token.buysell types` tab:
`limit` places the order untouched; `market` fills immediately or cancels;
`fok` fills completely or cancels; `passive` never crosses a matching offer.
