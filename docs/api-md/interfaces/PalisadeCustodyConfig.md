# Interface: PalisadeCustodyConfig

Defined in: [custodians/palisade/config.ts:31](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L31)

Configuration for [PalisadeCustody.create](../classes/PalisadeCustody.md#create).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/palisade/config.ts:39](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L39)

Allow the raw fallback for transactors/fields Palisade can't map.

***

### baseUrl

> `readonly` **baseUrl**: `string`

Defined in: [custodians/palisade/config.ts:33](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L33)

Palisade API base URL (must be HTTPS).

***

### credentials

> `readonly` **credentials**: [`PalisadeCredentials`](PalisadeCredentials.md)

Defined in: [custodians/palisade/config.ts:35](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L35)

The wallet-read and transactions API credentials.

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/palisade/config.ts:41](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L41)

How long to wait for a native submission to reach a terminal status.

***

### http?

> `readonly` `optional` **http**: `PalisadeHttpPort`

Defined in: [custodians/palisade/config.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L43)

Injectable transport (defaults to the production fetch port).

***

### now()?

> `readonly` `optional` **now**: () => `number`

Defined in: [custodians/palisade/config.ts:45](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L45)

Injectable clock for the auth service (defaults to `Date.now`).

#### Returns

`number`

***

### primary

> `readonly` **primary**: [`PalisadeWalletRef`](PalisadeWalletRef.md)

Defined in: [custodians/palisade/config.ts:37](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L37)

The wallet used when an operation is called without an explicit account.
