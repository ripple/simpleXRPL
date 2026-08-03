# Interface: PalisadeCustodyConfig

Defined in: [custodians/palisade/config.ts:40](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L40)

Configuration for [PalisadeCustody.create](../classes/PalisadeCustody.md#create).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/palisade/config.ts:48](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L48)

Allow the raw fallback for transactors/fields Palisade can't map.

***

### baseUrl

> `readonly` **baseUrl**: `string`

Defined in: [custodians/palisade/config.ts:42](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L42)

Palisade API base URL (must be HTTPS).

***

### credentials

> `readonly` **credentials**: [`PalisadeCredentials`](PalisadeCredentials.md)

Defined in: [custodians/palisade/config.ts:44](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L44)

The wallet-read and transactions API credentials.

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/palisade/config.ts:50](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L50)

How long to wait for a native submission to reach a terminal status.

***

### http?

> `readonly` `optional` **http**: `PalisadeHttpPort`

Defined in: [custodians/palisade/config.ts:52](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L52)

Injectable transport (defaults to the production fetch port).

***

### now()?

> `readonly` `optional` **now**: () => `number`

Defined in: [custodians/palisade/config.ts:54](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L54)

Injectable clock for the auth service (defaults to `Date.now`).

#### Returns

`number`

***

### primary

> `readonly` **primary**: [`PalisadeWalletRef`](PalisadeWalletRef.md)

Defined in: [custodians/palisade/config.ts:46](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L46)

The wallet used when an operation is called without an explicit account.
