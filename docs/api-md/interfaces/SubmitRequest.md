# Interface: SubmitRequest

Defined in: [pipeline/pipeline.ts:21](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L21)

A built transaction plus the resolved account and per-call options, handed to
[submitTransaction](../functions/submitTransaction.md).

## Properties

### account

> `readonly` **account**: [`Account`](Account.md)

Defined in: [pipeline/pipeline.ts:26](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L26)

The resolved source account.

***

### async?

> `readonly` `optional` **async**: `boolean`

Defined in: [pipeline/pipeline.ts:44](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L44)

Return a handle as soon as the intent is accepted, instead of blocking.

***

### customProperties?

> `readonly` `optional` **customProperties**: `Record`\<`string`, `unknown`\>

Defined in: [pipeline/pipeline.ts:35](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L35)

Free-form approval metadata for custodian intents.

***

### dryRun?

> `readonly` `optional` **dryRun**: `boolean`

Defined in: [pipeline/pipeline.ts:32](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L32)

Pre-flight the write through the backend's dry-run, where supported.

***

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [pipeline/pipeline.ts:29](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L29)

Fee override; falls back to the custodian's default.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [pipeline/pipeline.ts:38](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L38)

Stable, client-generated id making a retry idempotent.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [pipeline/pipeline.ts:41](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L41)

How long to wait before handing control back.

***

### transaction

> `readonly` **transaction**: `Transaction`

Defined in: [pipeline/pipeline.ts:23](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/pipeline/pipeline.ts#L23)

The transaction built by the vertical.
