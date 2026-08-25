# Interface: RippleCustodyFromEnvOptions

Defined in: [custodians/ripple/construction.ts:73](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L73)

Construction options for [RippleCustody.fromEnv](../classes/RippleCustody.md#fromenv).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/ripple/construction.ts:93](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L93)

Enable the raw-signing fallback for transactors and fields this backend has
no native operation for.

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

### defaultDryRun?

> `readonly` `optional` **defaultDryRun**: `boolean`

Defined in: [custodians/ripple/construction.ts:97](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L97)

Pre-flight every write through Custody's dry-run. Defaults to `false`.

***

### defaultFee?

> `readonly` `optional` **defaultFee**: [`FeeIntent`](FeeIntent.md)

Defined in: [custodians/ripple/construction.ts:95](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L95)

House fee intent, falls back to `Priority: Low`.

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/ripple/construction.ts:99](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L99)

How long `submitAndWait` polls before throwing `IntentPendingError`.

***

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [custodians/ripple/construction.ts:101](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L101)

Environment source to scan. Defaults to `process.env`.

***

### http?

> `readonly` `optional` **http**: `CustodyHttpPort`

Defined in: [custodians/ripple/construction.ts:103](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L103)

Injectable transport; defaults to `FetchHttpPort`.

***

### primary

> `readonly` **primary**: `string`

Defined in: [custodians/ripple/construction.ts:75](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L75)

The primary account's r-address; validated against the discovered set.
