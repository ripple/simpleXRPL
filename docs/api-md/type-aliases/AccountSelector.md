# Type Alias: AccountSelector

> **AccountSelector**: `string` \| \{ `address`: `string`; \} \| \{ `account`: `string`; `signer`: [`Custodian`](../interfaces/Custodian.md); \}

Defined in: [domain/model.ts:69](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L69)

Caller-facing way to choose the source account for an operation: a bare address, an
explicit address, or a signer (optionally narrowed to one of its accounts).
