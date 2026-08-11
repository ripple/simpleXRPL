# Interface: RippleCustodyOptions

Defined in: [custodians/ripple/construction.ts:37](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L37)

Construction options for [RippleCustody.create](../classes/RippleCustody.md#create).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/ripple/construction.ts:63](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L63)

Enable the raw-signing fallback for transactors and fields this backend has
no native operation for.

**Security note.** On the raw path the custodian signs an opaque payload
rather than a structured operation, so its transaction-level controls —
transfer policies, allow-lists, and approval rules keyed to operation
semantics — cannot inspect what is being signed. Ripple Custody types that
payload `Unsafe` for exactly this reason. xrpl.js protocol validation still
runs on every path, so malformed transactions are still rejected; what is
lost is the custodian's ability to reason about the transaction's intent.

Leave this off unless a specific transactor requires it, and prefer routing
those operations through a signer that models them natively.

#### Default Value

`false`

***

### auth

> `readonly` **auth**: [`RippleCustodyAuthOptions`](RippleCustodyAuthOptions.md)

Defined in: [custodians/ripple/construction.ts:41](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L41)

Intent-author credentials and token endpoint.

***

### defaultDryRun?

> `readonly` `optional` **defaultDryRun**: `boolean`

Defined in: [custodians/ripple/construction.ts:67](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L67)

Pre-flight every write through Custody's dry-run. Defaults to `false`.

***

### defaultFee?

> `readonly` `optional` **defaultFee**: [`FeeIntent`](FeeIntent.md)

Defined in: [custodians/ripple/construction.ts:65](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L65)

House fee intent, falls back to `Priority: Low`.

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/ripple/construction.ts:69](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L69)

How long `submitAndWait` polls before throwing `IntentPendingError`.

***

### domainId

> `readonly` **domainId**: `string`

Defined in: [custodians/ripple/construction.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L43)

The Custody domain this custodian operates in.

***

### gatewayUrl

> `readonly` **gatewayUrl**: `string`

Defined in: [custodians/ripple/construction.ts:39](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L39)

The Custody gateway base URL.

***

### http?

> `readonly` `optional` **http**: `CustodyHttpPort`

Defined in: [custodians/ripple/construction.ts:71](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L71)

Injectable transport; defaults to `FetchHttpPort`.

***

### primary

> `readonly` **primary**: `string`

Defined in: [custodians/ripple/construction.ts:45](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L45)

The primary account's r-address; validated against the discovered set.
