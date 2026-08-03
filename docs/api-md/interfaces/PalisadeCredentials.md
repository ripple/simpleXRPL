# Interface: PalisadeCredentials

Defined in: [custodians/palisade/config.ts:25](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L25)

The two Palisade API credentials the connector requires. Palisade scopes one
permission set per credential, so a full setup needs both: a **wallets**
credential (wallet-read) for account discovery, and a **transactions**
credential for signing and submitting.

## Properties

### scoped?

> `readonly` `optional` **scoped**: `Partial`\<`Record`\<`PalisadeScope`, [`PalisadeClientCredentials`](PalisadeClientCredentials.md)\>\>

Defined in: [custodians/palisade/config.ts:36](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L36)

Optional per-scope credentials for the `palisade.api` surface (tag-based
routing, option b). Each key is a Palisade permission scope (an operation's
OpenAPI tag, e.g. `Policies` or `Webhooks`); operations in that scope route
to its credential instead of falling back to the wallets/transactions pair.

***

### transactions

> `readonly` **transactions**: [`PalisadeClientCredentials`](PalisadeClientCredentials.md)

Defined in: [custodians/palisade/config.ts:29](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L29)

Transactions credential — authorizes signing and submission.

***

### wallets

> `readonly` **wallets**: [`PalisadeClientCredentials`](PalisadeClientCredentials.md)

Defined in: [custodians/palisade/config.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L27)

Wallet-read credential — authorizes discovery (`GET /v2/wallets`).
