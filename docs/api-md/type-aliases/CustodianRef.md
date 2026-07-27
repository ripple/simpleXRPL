# Type Alias: CustodianRef

> **CustodianRef**: `string` \| \{ `vaultId`: `string`; `walletId`: `string`; \}

Defined in: [domain/model.ts:21](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/domain/model.ts#L21)

A custodian's opaque native identifier for an account: a string for
account-id custodians, a vault/wallet pair for vault-based custodians, and
absent for local wallets. Read only by the owning custodian.
