# Type Alias: Asset

> **Asset**: \{ `kind`: `"xrp"`; \} \| \{ `currency`: `string`; `issuer`: `string`; `kind`: `"iou"`; \} \| \{ `kind`: `"mpt"`; `mptIssuanceId`: `string`; `scale`: `number`; \}

Defined in: [amount/asset.ts:5](https://github.com/ripple/simpleXRPL/blob/main/src/amount/asset.ts#L5)

An asset that can be represented and moved on the XRP Ledger: native XRP, an
issued currency (IOU), or a Multi-Purpose Token (MPT).
