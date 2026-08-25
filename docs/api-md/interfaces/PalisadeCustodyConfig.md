# Interface: PalisadeCustodyConfig

Defined in: [custodians/palisade/config.ts:40](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L40)

Configuration for [PalisadeCustody.create](../classes/PalisadeCustody.md#create).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/palisade/config.ts:64](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L64)

Enable the raw-signing fallback for transactors and fields Palisade cannot map
natively.

**Security note.** On the raw path the custodian signs an opaque payload
rather than a structured operation, so its transaction-level controls —
transfer policies, allow-lists, and approval rules keyed to operation
semantics — cannot inspect what is being signed. Ripple Custody types that
payload `Unsafe` for exactly this reason. xrpl protocol validation still
runs on every path, so malformed transactions are still rejected; what is
lost is the custodian's ability to reason about the transaction's intent.

Leave this off unless a specific transactor requires it, and prefer routing
those operations through a signer that models them natively.

#### Default Value

`false`

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

Defined in: [custodians/palisade/config.ts:66](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L66)

How long to wait for a native submission to reach a terminal status.

***

### http?

> `readonly` `optional` **http**: `PalisadeHttpPort`

Defined in: [custodians/palisade/config.ts:68](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L68)

Injectable transport (defaults to the production fetch port).

***

### now()?

> `readonly` `optional` **now**: () => `number`

Defined in: [custodians/palisade/config.ts:70](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L70)

Injectable clock for the auth service (defaults to `Date.now`).

#### Returns

`number`

***

### primary

> `readonly` **primary**: [`PalisadeWalletRef`](PalisadeWalletRef.md)

Defined in: [custodians/palisade/config.ts:46](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/config.ts#L46)

The wallet used when an operation is called without an explicit account.
