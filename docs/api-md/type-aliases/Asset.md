# Type Alias: Asset

> **Asset**: \{ `kind`: `"xrp"`; \} \| \{ `currency`: `string`; `issuer`: `string`; `kind`: `"iou"`; \} \| \{ `kind`: `"mpt"`; `mptIssuanceId`: `string`; `scale`: `number`; \}

Defined in: [src/amount/asset.ts:5](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/amount/asset.ts#L5)

An asset that can be represented and moved on the XRP Ledger: native XRP, an
issued currency (IOU), or a Multi-Purpose Token (MPT).
