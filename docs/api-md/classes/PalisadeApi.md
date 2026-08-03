# Class: PalisadeApi

Defined in: custodians/palisade/api.ts:84

Low-level, typed access to the full Palisade v2 API — a **secondary** surface
beside the first-class verticals, for operations simpleXRPL doesn't model
(vaults, counterparties, policies, webhooks, balances, and so on).

`call(operationId, args)` resolves the route from the generated route map and
infers the path/query/body and response types from the generated `operations`
schema, so every endpoint is typed without a hand-written method per resource.

Auth routing has two layers. Tag-based routing (option b) comes first: if a
client is registered for the operation's permission scope (its OpenAPI tag,
e.g. `Policies` or `Webhooks`), that client is used — since Palisade scopes
one permission set per credential, a full deployment registers one per scope
it uses. Otherwise it falls back to method-based routing (option a): reads
(`GET`) on the wallet-read credential, mutations on the transactions one. An
operation whose scope no registered credential carries gets a 403 from
Palisade.

## Constructors

### new PalisadeApi()

> **new PalisadeApi**(`readClient`, `writeClient`, `byScope`): [`PalisadeApi`](PalisadeApi.md)

Defined in: custodians/palisade/api.ts:96

Construct the API surface over the authenticated clients.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `readClient` | `PalisadeHttpClient` | Authenticated with the wallet-read credential (GETs). |
| `writeClient` | `PalisadeHttpClient` | Authenticated with the transactions credential (mutations). |
| `byScope` | `Partial` | Optional per-scope clients for tag-based routing (option b). |

#### Returns

[`PalisadeApi`](PalisadeApi.md)

## Methods

### call()

> **call**\<`Op`\>(`operationId`, `args`?): `Promise`\<`ResponseBody`\<`Op`\>\>

Defined in: custodians/palisade/api.ts:116

Call any Palisade operation by its operationId. Path/query/body and the
response are typed from the generated schema.

#### Type Parameters

| Type Parameter |
| ------ |
| `Op` *extends* `"BalanceService_GetOrgBalances"` \| `"BalanceService_GetVaultBalances"` \| `"BalanceService_GetWalletBalances"` \| `"BalanceService_SyncWalletBalances"` \| `"CounterpartyService_CreateAddress"` \| `"CounterpartyService_CreateCounterparty"` \| `"CounterpartyService_DeleteAddress"` \| `"CounterpartyService_DeleteCounterparty"` \| `"CounterpartyService_GetAddress"` \| `"CounterpartyService_GetCounterparty"` \| `"CounterpartyService_ListAddresses"` \| `"CounterpartyService_ListCounterparties"` \| `"CounterpartyService_ListGlobalAddresses"` \| `"CounterpartyService_UpdateCounterparty"` \| `"CredentialService_ExchangeCredential"` \| `"PolicyService_CreateWalletLimit"` \| `"PolicyService_DeleteWalletLimit"` \| `"PolicyService_GetWalletLimit"` \| `"PolicyService_ListGlobalWalletLimits"` \| `"PolicyService_ListWalletLimits"` \| `"SweepService_TriggerSweepConfiguration"` \| `"TransactionsService_EstimateTransferFee"` \| `"TransactionsService_FreezeTransaction"` \| `"TransactionsService_GetTransaction"` \| `"TransactionsService_ListSweepInstanceTransactions"` \| `"TransactionsService_ListWalletTransactions"` \| `"TransactionsService_RawTransaction"` \| `"TransactionsService_SignPlaintext"` \| `"TransactionsService_SubmitAccountSet"` \| `"TransactionsService_SubmitAMMCreate"` \| `"TransactionsService_SubmitAMMDeposit"` \| `"TransactionsService_SubmitAMMWithdraw"` \| `"TransactionsService_SubmitClawback"` \| `"TransactionsService_SubmitOfferCancel"` \| `"TransactionsService_SubmitOfferCreate"` \| `"TransactionsService_SubmitSignerListSet"` \| `"TransactionsService_SubmitTrustSet"` \| `"TransactionsService_TransferTransaction"` \| `"TransactionsService_UnfreezeTransaction"` \| `"VaultService_AddVaultTag"` \| `"VaultService_AddWalletTag"` \| `"VaultService_CreateVault"` \| `"VaultService_CreateWallet"` \| `"VaultService_DeleteVaultTag"` \| `"VaultService_DeleteWallet"` \| `"VaultService_DeleteWalletTag"` \| `"VaultService_GetVault"` \| `"VaultService_GetWallet"` \| `"VaultService_GetWalletByID"` \| `"VaultService_GetWalletSequence"` \| `"VaultService_ListGlobalTags"` \| `"VaultService_ListGlobalVaultTags"` \| `"VaultService_ListGlobalWallets"` \| `"VaultService_ListVaults"` \| `"VaultService_ListVaultTags"` \| `"VaultService_ListVaultWallets"` \| `"VaultService_ListWalletTags"` \| `"VaultService_ListWalletTagsInVault"` \| `"VaultService_UpdateVault"` \| `"VaultService_UpdateWallet"` \| `"VaultService_UpdateWalletSettings"` \| `"WebhookService_CreateSubscriptions"` \| `"WebhookService_CreateWebhook"` \| `"WebhookService_DeleteSubscription"` \| `"WebhookService_DeleteWebhook"` \| `"WebhookService_GetSubscription"` \| `"WebhookService_GetWebhook"` \| `"WebhookService_ListSubscriptions"` \| `"WebhookService_ListWebhooks"` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `operationId` | `Op` | The Palisade operationId (autocompletes to all routes). |
| `args`? | [`PalisadeCallArgs`](../interfaces/PalisadeCallArgs.md)\<`Op`\> | Typed path params, query params, and/or JSON body. |

#### Returns

`Promise`\<`ResponseBody`\<`Op`\>\>

The typed response body.

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if a required path parameter is missing.

#### Throws

A `PalisadeApiError` if the API rejects the request (e.g. 403/404).
