# Type Alias: AccountSelector

> **AccountSelector**: `string` \| \{ `address`: `string`; \} \| \{ `account`: `string`; `signer`: [`Custodian`](../interfaces/Custodian.md); \}

Defined in: [src/domain/model.ts:55](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L55)

Caller-facing way to choose the source account for a verb: a bare address, an
explicit address, or a signer (optionally narrowed to one of its accounts).
