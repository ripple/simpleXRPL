# Interface: PalisadeWalletRef

Defined in: [custodians/palisade/config.ts:4](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L4)

The primary wallet's Palisade coordinates.

## Properties

### vaultId

> `readonly` **vaultId**: `string`

Defined in: [custodians/palisade/config.ts:5](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L5)

***

### walletId

> `readonly` **walletId**: `string`

Defined in: [custodians/palisade/config.ts:6](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L6)

***

### xrplAddress?

> `readonly` `optional` **xrplAddress**: `string`

Defined in: [custodians/palisade/config.ts:14](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L14)

The wallet's XRPL r-address. Optional: when provided, [PalisadeCustody.create](../classes/PalisadeCustody.md#create) binds the primary directly and **skips wallet
discovery** (the `GET /v2/wallets` listing). Supply it when the API
credential is scoped to transactions only and cannot read the wallet list;
omit it to have the address resolved by discovery instead.
