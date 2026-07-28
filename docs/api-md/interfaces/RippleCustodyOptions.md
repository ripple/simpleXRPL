# Interface: RippleCustodyOptions

Defined in: [custodians/ripple/construction.ts:30](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L30)

Construction options for [RippleCustody.create](../classes/RippleCustody.md#create).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/ripple/construction.ts:40](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L40)

Enable the raw-signing fallback (TDD §12.1). Defaults to `false`.

***

### auth

> `readonly` **auth**: [`RippleCustodyAuthOptions`](RippleCustodyAuthOptions.md)

Defined in: [custodians/ripple/construction.ts:34](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L34)

Intent-author credentials and token endpoint.

***

### defaultDryRun?

> `readonly` `optional` **defaultDryRun**: `boolean`

Defined in: [custodians/ripple/construction.ts:44](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L44)

Pre-flight every write through Custody's dry-run. Defaults to `false`.

***

### defaultFee?

> `readonly` `optional` **defaultFee**: [`FeeIntent`](FeeIntent.md)

Defined in: [custodians/ripple/construction.ts:42](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L42)

House fee intent, falls back to `Priority: Low`.

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/ripple/construction.ts:46](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L46)

How long `submitAndWait` polls before throwing `IntentPendingError`.

***

### domainId

> `readonly` **domainId**: `string`

Defined in: [custodians/ripple/construction.ts:36](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L36)

The Custody domain this custodian operates in.

***

### gatewayUrl

> `readonly` **gatewayUrl**: `string`

Defined in: [custodians/ripple/construction.ts:32](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L32)

The Custody gateway base URL.

***

### http?

> `readonly` `optional` **http**: `CustodyHttpPort`

Defined in: [custodians/ripple/construction.ts:48](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L48)

Injectable transport; defaults to `FetchHttpPort`.

***

### primary

> `readonly` **primary**: `string`

Defined in: [custodians/ripple/construction.ts:38](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/ripple/construction.ts#L38)

The primary account's r-address; validated against the discovered set.
