# Interface: RippleCustodyFromEnvOptions

Defined in: [custodians/ripple/construction.ts:52](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L52)

Construction options for [RippleCustody.fromEnv](../classes/RippleCustody.md#fromenv).

## Properties

### allowRawSigning?

> `readonly` `optional` **allowRawSigning**: `boolean`

Defined in: [custodians/ripple/construction.ts:56](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L56)

Enable the raw-signing fallback (TDD §12.1). Defaults to `false`.

***

### defaultDryRun?

> `readonly` `optional` **defaultDryRun**: `boolean`

Defined in: [custodians/ripple/construction.ts:60](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L60)

Pre-flight every write through Custody's dry-run. Defaults to `false`.

***

### defaultFee?

> `readonly` `optional` **defaultFee**: [`FeeIntent`](FeeIntent.md)

Defined in: [custodians/ripple/construction.ts:58](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L58)

House fee intent, falls back to `Priority: Low`.

***

### defaultTimeoutMs?

> `readonly` `optional` **defaultTimeoutMs**: `number`

Defined in: [custodians/ripple/construction.ts:62](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L62)

How long `submitAndWait` polls before throwing `IntentPendingError`.

***

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [custodians/ripple/construction.ts:64](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L64)

Environment source to scan. Defaults to `process.env`.

***

### http?

> `readonly` `optional` **http**: `CustodyHttpPort`

Defined in: [custodians/ripple/construction.ts:66](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L66)

Injectable transport; defaults to `FetchHttpPort`.

***

### primary

> `readonly` **primary**: `string`

Defined in: [custodians/ripple/construction.ts:54](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/ripple/construction.ts#L54)

The primary account's r-address; validated against the discovered set.
