# Interface: PalisadeCustodyConfig

Defined in: [custodians/palisade/config.ts:18](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L18)

Configuration for [PalisadeCustody.create](../classes/PalisadeCustody.md#create).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/palisade/config.ts:28](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L28)

Allow the raw fallback for transactors/fields Palisade can't map.

***

### baseUrl

> `readonly` **baseUrl**: `string`

Defined in: [custodians/palisade/config.ts:20](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L20)

Palisade API base URL (must be HTTPS).

***

### clientId

> `readonly` **clientId**: `string`

Defined in: [custodians/palisade/config.ts:22](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L22)

OAuth2 client-credentials id.

***

### clientSecret

> `readonly` **clientSecret**: `string`

Defined in: [custodians/palisade/config.ts:24](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L24)

OAuth2 client-credentials secret (held in memory only).

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/palisade/config.ts:30](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L30)

How long to wait for a native submission to reach a terminal status.

***

### http?

> `readonly` `optional` **http**: `PalisadeHttpPort`

Defined in: [custodians/palisade/config.ts:32](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L32)

Injectable transport (defaults to the production fetch port).

***

### now()?

> `readonly` `optional` **now**: () => `number`

Defined in: [custodians/palisade/config.ts:34](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L34)

Injectable clock for the auth service (defaults to `Date.now`).

#### Returns

`number`

***

### primary

> `readonly` **primary**: [`PalisadeWalletRef`](PalisadeWalletRef.md)

Defined in: [custodians/palisade/config.ts:26](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/palisade/config.ts#L26)

The wallet used when a verb is called without an explicit account.
