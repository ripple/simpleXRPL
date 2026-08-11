# Interface: LocalSignerCreateOptions

Defined in: [custodians/local/local-signer.ts:23](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L23)

Options for [LocalSigner.create](../classes/LocalSigner.md#create).

## Properties

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [custodians/local/local-signer.ts:28](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L28)

The primary account's r-address. Defaults to the first wallet.

***

### wallets

> `readonly` **wallets**: readonly `Wallet`[]

Defined in: [custodians/local/local-signer.ts:25](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L25)

The wallets this signer holds (at least one).
