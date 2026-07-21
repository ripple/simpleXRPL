# Type Alias: CustodianRef

> **CustodianRef**: `string` \| \{ `vaultId`: `string`; `walletId`: `string`; \}

Defined in: [src/domain/model.ts:17](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L17)

A custodian's opaque native identifier for an account: a string for
account-id custodians, a vault/wallet pair for vault-based custodians, and
absent for local wallets. Read only by the owning custodian.
