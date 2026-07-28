# Interface: LocalSignerCreateOptions

Defined in: [custodians/local/local-signer.ts:22](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L22)

Options for [LocalSigner.create](../classes/LocalSigner.md#create).

## Properties

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [custodians/local/local-signer.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L27)

The primary account's r-address. Defaults to the first wallet.

***

### wallets

> `readonly` **wallets**: readonly `Wallet`[]

Defined in: [custodians/local/local-signer.ts:24](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L24)

The wallets this signer holds (at least one).
