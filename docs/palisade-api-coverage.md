# Palisade API — simpleXRPL coverage

Every Palisade v2 API operation (from the vendored OpenAPI spec, `openapi/palisade-api.yaml`), and whether simpleXRPL's `PalisadeCustody` connector uses it. Descriptions are the spec's own summaries.

- **Supported:** 11
- **Not yet supported:** 58
- **Total operations:** 69

## Supported

| Method | Endpoint | Palisade summary | How simpleXRPL uses it |
| --- | --- | --- | --- |
| `POST` | `/v2/credentials/oauth/token` | Client credentials exchange | Authentication — exchanges the client credentials for a bearer token. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/raw` | Create a new raw transaction | Raw sign-only fallback — used for transactors Palisade has no native op for (e.g. all MPT ops), when `allowRawSigning` is on. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/transfer` | Create a new transfer transaction | Native Payment — `xrp.transfer`, `iou.transfer`, `token.transfer`. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/account-set` | Create a new XRP Account Set transaction | Native AccountSet — `account.set`, and `iou.issue` (issuer defaultRipple). |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/clawback` | Create a new XRP Clawback transaction | Native Clawback — `iou.clawback`. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/offer-cancel` | Create a new XRP Offer Cancel transaction | Native OfferCancel — `iou`/`token`.cancelOffer. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/offer-create` | Create a new XRP Offer Create transaction | Native OfferCreate — `iou`/`token` `buyOffer` / `sellOffer` / `createOffer`. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/trust-set` | Create a new XRP Trust Set transaction | Native TrustSet — `iou.issue` / `authorize` / `lock` / `unlock`. |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/{transactionId}` | Get a transaction | Submission status polling — `submitAndWait` and `client.intent.status` / `await`. |
| `PUT` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/{transactionId}/freeze` | Freeze a transaction | `cancel()` — places a reversible freeze hold on a still-pending intent. |
| `GET` | `/v2/wallets` | List organization wallets | Account discovery — lists the org's XRPL wallets (via the wallet-read credential) to build the account index. |

## Not Yet Supported

| Method | Endpoint | Palisade summary | Why not / notes |
| --- | --- | --- | --- |
| `GET` | `/v2/addresses` | List organization addresses | Address Book / counterparties — managed in Palisade directly. |
| `GET` | `/v2/balances` | Get Organization Balances | Balances are read through the XRPL ledger (`account_info`, `iou`/`token` reads). |
| `GET` | `/v2/counterparties` | List counterparties | Address Book / counterparties — managed in Palisade directly. |
| `POST` | `/v2/counterparties` | Create counterparties | Address Book / counterparties — managed in Palisade directly. |
| `GET` | `/v2/counterparties/{counterpartyId}/addresses` | List counterparty addresses | Address Book / counterparties — managed in Palisade directly. |
| `POST` | `/v2/counterparties/{counterpartyId}/addresses` | Create addresses | Address Book / counterparties — managed in Palisade directly. |
| `GET` | `/v2/counterparties/{counterpartyId}/addresses/{addressId}` | Get addresses | Address Book / counterparties — managed in Palisade directly. |
| `DELETE` | `/v2/counterparties/{counterpartyId}/addresses/{addressId}` | Delete addresses | Address Book / counterparties — managed in Palisade directly. |
| `GET` | `/v2/counterparties/{id}` | Get counterparties | Address Book / counterparties — managed in Palisade directly. |
| `DELETE` | `/v2/counterparties/{id}` | Delete counterparties | Address Book / counterparties — managed in Palisade directly. |
| `PUT` | `/v2/counterparties/{id}` | Update counterparties | Address Book / counterparties — managed in Palisade directly. |
| `GET` | `/v2/policy-rules/limits` | List organization wallet limits | Policy/limit administration — governance, out of scope. |
| `GET` | `/v2/tags` | List all tags for the organization | Tag administration — out of scope. |
| `GET` | `/v2/transactions/sweep/{sweepId}` | List transactions for a sweep instance | Treasury sweep automation — out of scope. |
| `POST` | `/v2/transactions/transfer/estimate-fee` | Estimate the fee for a transfer transaction | Not wired into the connector. |
| `GET` | `/v2/vaults` | List vaults | Vault provisioning/admin — out of scope. |
| `POST` | `/v2/vaults` | Create a vault | Vault provisioning/admin — out of scope. |
| `GET` | `/v2/vaults/tags` | List all vault tags for the organization | Tag administration — out of scope. |
| `GET` | `/v2/vaults/{id}` | Get a vault | Vault provisioning/admin — out of scope. |
| `PUT` | `/v2/vaults/{id}` | Update a vault | Vault provisioning/admin — out of scope. |
| `GET` | `/v2/vaults/{vaultId}/balances` | Get Vault Balances | Balances are read through the XRPL ledger (`account_info`, `iou`/`token` reads). |
| `GET` | `/v2/vaults/{vaultId}/tags` | List tags for the vault | Tag administration — out of scope. |
| `DELETE` | `/v2/vaults/{vaultId}/tags` | Delete a vault tag | Tag administration — out of scope. |
| `POST` | `/v2/vaults/{vaultId}/tags` | Add a new vault tag | Tag administration — out of scope. |
| `GET` | `/v2/vaults/{vaultId}/wallets` | List vault wallets | Read directly from the XRPL ledger or not needed by the SDK. |
| `POST` | `/v2/vaults/{vaultId}/wallets` | Create a wallet | Wallet provisioning/admin — out of scope (`account.create` is local key generation). |
| `GET` | `/v2/vaults/{vaultId}/wallets/tags` | List all wallet tags in vault | Tag administration — out of scope. |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}` | Get a wallet | Read directly from the XRPL ledger or not needed by the SDK. |
| `DELETE` | `/v2/vaults/{vaultId}/wallets/{walletId}` | Delete a wallet | Wallet provisioning/admin — out of scope (`account.create` is local key generation). |
| `PUT` | `/v2/vaults/{vaultId}/wallets/{walletId}` | Update a wallet | Wallet provisioning/admin — out of scope (`account.create` is local key generation). |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/balances` | Get Wallet Balances | Balances are read through the XRPL ledger (`account_info`, `iou`/`token` reads). |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/balances/sync` | Sync Wallet Balances | Balances are read through the XRPL ledger (`account_info`, `iou`/`token` reads). |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/policy-rules/limits` | List wallet limit policies | Policy/limit administration — governance, out of scope. |
| `PUT` | `/v2/vaults/{vaultId}/wallets/{walletId}/policy-rules/limits` | Create a wallet limit policy | Policy/limit administration — governance, out of scope. |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/policy-rules/limits/{id}` | Get a wallet limit policy | Policy/limit administration — governance, out of scope. |
| `DELETE` | `/v2/vaults/{vaultId}/wallets/{walletId}/policy-rules/limits/{id}` | Delete a wallet limit policy | Policy/limit administration — governance, out of scope. |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/sequence` | Get a wallet nonce/sequence | Sequence is autofilled through the XRPL ledger, not read from Palisade. |
| `PUT` | `/v2/vaults/{vaultId}/wallets/{walletId}/settings` | Update a wallet's settings | Wallet provisioning/admin — out of scope (`account.create` is local key generation). |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/tags` | List wallet tags for the wallet | Tag administration — out of scope. |
| `DELETE` | `/v2/vaults/{vaultId}/wallets/{walletId}/tags` | Delete a wallet tag | Tag administration — out of scope. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/tags` | Add a new wallet tag | Tag administration — out of scope. |
| `GET` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions` | List wallet transactions | Transaction history isn't exposed (SDK polls a single tx by id). |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/sign-plaintext` | (BETA) Create a new sign plaintext transaction | Arbitrary plaintext signing (BETA) — not mapped. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/amm-create` | Create a new XRP AMM Create transaction | No AMM vertical in simpleXRPL yet. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/amm-deposit` | Create a new XRP AMM Deposit transaction | No AMM vertical in simpleXRPL yet. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/amm-withdraw` | Create a new XRP AMM Withdraw transaction | No AMM vertical in simpleXRPL yet. |
| `POST` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/xrp/signer-list-set` | Create a new XRP SignerList Set transaction | XRPL multisign is deferred (out of scope for v1). |
| `PUT` | `/v2/vaults/{vaultId}/wallets/{walletId}/transactions/{transactionId}/unfreeze` | Unfreeze a transaction | `cancel()` is a one-way freeze hold; unfreeze isn't exposed. |
| `GET` | `/v2/wallets/{id}` | Get a wallet by ID | Read directly from the XRPL ledger or not needed by the SDK. |
| `GET` | `/v2/webhooks` | List webhooks | Event push — the SDK polls instead. |
| `POST` | `/v2/webhooks` | Create webhooks | Event push — the SDK polls instead. |
| `GET` | `/v2/webhooks/{id}` | Get webhooks | Event push — the SDK polls instead. |
| `DELETE` | `/v2/webhooks/{id}` | Delete webhooks | Event push — the SDK polls instead. |
| `GET` | `/v2/webhooks/{webhookId}/subscriptions` | List subscriptions | Event push — the SDK polls instead. |
| `POST` | `/v2/webhooks/{webhookId}/subscriptions` | Create webhook subscriptions | Event push — the SDK polls instead. |
| `GET` | `/v2/webhooks/{webhookId}/subscriptions/{subscriptionId}` | Get subscriptions | Event push — the SDK polls instead. |
| `DELETE` | `/v2/webhooks/{webhookId}/subscriptions/{subscriptionId}` | Delete subscriptions | Event push — the SDK polls instead. |
| `POST` | `/v2/workflows/sweep/{id}/trigger` | Trigger a sweep configuration | Treasury sweep automation — out of scope. |
