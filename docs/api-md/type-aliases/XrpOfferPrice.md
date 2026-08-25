# Type Alias: XrpOfferPrice

> **XrpOfferPrice**: \{ `amount`: `string`; `mptIssuanceId`: `string`; \} \| \{ `amount`: `string`; `issuer`: `string`; `ticker`: `string`; \}

Defined in: [verticals/xrp.ts:79](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/xrp.ts#L79)

How an XRP offer is priced: the counter-asset paid ([XRP.buyOffer](../classes/XRP.md#buyoffer)) or
received ([XRP.sellOffer](../classes/XRP.md#selloffer)) for the XRP. It is an MPT or another IOU —
never XRP, since an XRP-for-XRP offer is meaningless.
