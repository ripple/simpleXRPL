# Type Alias: AccountSelector

> **AccountSelector**: `string` \| \{ `address`: `string`; \} \| \{ `account`: `string`; `signer`: [`Custodian`](../interfaces/Custodian.md); \}

Defined in: [domain/model.ts:59](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/domain/model.ts#L59)

Caller-facing way to choose the source account for a verb: a bare address, an
explicit address, or a signer (optionally narrowed to one of its accounts).
