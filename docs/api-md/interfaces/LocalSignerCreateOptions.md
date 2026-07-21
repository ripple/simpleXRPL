# Interface: LocalSignerCreateOptions

Defined in: [src/custodians/local/local-signer.ts:22](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/local/local-signer.ts#L22)

Options for [LocalSigner.create](../classes/LocalSigner.md#create).

## Properties

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [src/custodians/local/local-signer.ts:27](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/local/local-signer.ts#L27)

The primary account's r-address. Defaults to the first wallet.

***

### wallets

> `readonly` **wallets**: readonly `Wallet`[]

Defined in: [src/custodians/local/local-signer.ts:24](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/local/local-signer.ts#L24)

The wallets this signer holds (at least one).
