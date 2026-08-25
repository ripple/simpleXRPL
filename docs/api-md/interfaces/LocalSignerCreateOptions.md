# Interface: LocalSignerCreateOptions

Defined in: [custodians/local/local-signer.ts:24](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L24)

Options for [LocalSigner.create](../classes/LocalSigner.md#create).

## Properties

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [custodians/local/local-signer.ts:29](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L29)

The primary account's r-address. Defaults to the first wallet.

***

### wallets

> `readonly` **wallets**: readonly `Wallet`[]

Defined in: [custodians/local/local-signer.ts:26](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L26)

The wallets this signer holds (at least one).
