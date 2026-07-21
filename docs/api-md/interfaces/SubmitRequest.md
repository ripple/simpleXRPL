# Interface: SubmitRequest

Defined in: [src/pipeline/pipeline.ts:19](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L19)

A built transaction plus the resolved account and per-call options, handed to
[submitTransaction](../functions/submitTransaction.md).

## Properties

### account

> `readonly` **account**: [`Account`](Account.md)

Defined in: [src/pipeline/pipeline.ts:24](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L24)

The resolved source account.

***

### customProperties?

> `readonly` `optional` **customProperties**: `Record`\<`string`, `unknown`\>

Defined in: [src/pipeline/pipeline.ts:33](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L33)

Free-form approval metadata for custodian intents.

***

### dryRun?

> `readonly` `optional` **dryRun**: `boolean`

Defined in: [src/pipeline/pipeline.ts:30](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L30)

Pre-flight the write through the backend's dry-run, where supported.

***

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/pipeline/pipeline.ts:27](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L27)

Fee override; falls back to the custodian's default.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [src/pipeline/pipeline.ts:36](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L36)

Stable, client-generated id making a retry idempotent.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [src/pipeline/pipeline.ts:39](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L39)

How long to wait before handing control back.

***

### transaction

> `readonly` **transaction**: `Transaction`

Defined in: [src/pipeline/pipeline.ts:21](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/pipeline.ts#L21)

The transaction built by the vertical.
