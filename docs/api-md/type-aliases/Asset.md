# Type Alias: Asset

> **Asset**: \{ `kind`: `"xrp"`; \} \| \{ `currency`: `string`; `issuer`: `string`; `kind`: `"iou"`; \} \| \{ `kind`: `"mpt"`; `mptIssuanceId`: `string`; `scale`: `number`; \}

Defined in: [amount/asset.ts:5](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/amount/asset.ts#L5)

An asset that can be represented and moved on the XRP Ledger: native XRP, an
issued currency (IOU), or a Multi-Purpose Token (MPT).
