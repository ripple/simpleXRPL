# Type Alias: AccountSelector

> **AccountSelector**: `string` \| \{ `address`: `string`; \} \| \{ `account`: `string`; `signer`: [`Custodian`](../interfaces/Custodian.md); \}

Defined in: [src/domain/model.ts:55](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L55)

Caller-facing way to choose the source account for a verb: a bare address, an
explicit address, or a signer (optionally narrowed to one of its accounts).
