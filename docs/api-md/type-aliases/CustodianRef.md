# Type Alias: CustodianRef

> **CustodianRef**: `string` \| \{ `vaultId`: `string`; `walletId`: `string`; \}

Defined in: [src/domain/model.ts:17](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L17)

A custodian's opaque native identifier for an account: a string for
account-id custodians, a vault/wallet pair for vault-based custodians, and
absent for local wallets. Read only by the owning custodian.
