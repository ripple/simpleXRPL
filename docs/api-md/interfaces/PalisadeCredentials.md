# Interface: PalisadeCredentials

Defined in: [custodians/palisade/config.ts:23](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L23)

The two Palisade API credentials the connector requires. Palisade scopes one
permission set per credential, so a full setup needs both: a **wallets**
credential (wallet-read) for account discovery, and a **transactions**
credential for signing and submitting.

## Properties

### transactions

> `readonly` **transactions**: [`PalisadeClientCredentials`](PalisadeClientCredentials.md)

Defined in: [custodians/palisade/config.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L27)

Transactions credential — authorizes signing and submission.

***

### wallets

> `readonly` **wallets**: [`PalisadeClientCredentials`](PalisadeClientCredentials.md)

Defined in: [custodians/palisade/config.ts:25](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L25)

Wallet-read credential — authorizes discovery (`GET /v2/wallets`).
