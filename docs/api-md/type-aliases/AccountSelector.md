# Type Alias: AccountSelector

> **AccountSelector**: `string` \| \{ `address`: `string`; \} \| \{ `account`: `string`; `signer`: [`Custodian`](../interfaces/Custodian.md); \}

Defined in: [domain/model.ts:66](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L66)

Caller-facing way to choose the source account for an operation: a bare address, an
explicit address, or a signer (optionally narrowed to one of its accounts).
