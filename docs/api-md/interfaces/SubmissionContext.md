# Interface: SubmissionContext

Defined in: [domain/model.ts:110](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L110)

Per-submission context threaded through the pipeline to the custodian.

## Properties

### account

> `readonly` **account**: [`Account`](Account.md)

Defined in: [domain/model.ts:112](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L112)

The resolved source account the transaction acts on.

***

### async?

> `readonly` `optional` **async**: `boolean`

Defined in: [domain/model.ts:124](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L124)

Return a handle instead of blocking until the transaction is terminal.

***

### customProperties?

> `readonly` `optional` **customProperties**: `Record`\<`string`, `unknown`\>

Defined in: [domain/model.ts:130](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L130)

Human-readable approval metadata stamped on custody intents.

***

### dryRun?

> `readonly` `optional` **dryRun**: `boolean`

Defined in: [domain/model.ts:121](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L121)

Pre-flight the write through the backend's dry-run, where supported.

***

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [domain/model.ts:118](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L118)

Optional fee override; falls back to the custodian's configured default.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:127](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L127)

Stable, client-generated id that makes a retry resolve to the same intent.

***

### ledger

> `readonly` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [domain/model.ts:115](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L115)

The shared ledger connection the custodian submits through.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [domain/model.ts:133](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L133)

How long to wait before handing control back to the caller.
