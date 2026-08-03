# Interface: SubmissionContext

Defined in: [domain/model.ts:97](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L97)

Per-submission context threaded through the pipeline to the custodian.

## Properties

### account

> `readonly` **account**: [`Account`](Account.md)

Defined in: [domain/model.ts:99](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L99)

The resolved source account the transaction acts on.

***

### async?

> `readonly` `optional` **async**: `boolean`

Defined in: [domain/model.ts:111](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L111)

Return a handle instead of blocking until the transaction is terminal.

***

### customProperties?

> `readonly` `optional` **customProperties**: `Record`\<`string`, `unknown`\>

Defined in: [domain/model.ts:117](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L117)

Human-readable approval metadata stamped on custody intents.

***

### dryRun?

> `readonly` `optional` **dryRun**: `boolean`

Defined in: [domain/model.ts:108](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L108)

Pre-flight the write through the backend's dry-run, where supported.

***

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [domain/model.ts:105](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L105)

Optional fee override; falls back to the custodian's configured default.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:114](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L114)

Stable, client-generated id that makes a retry resolve to the same intent.

***

### ledger

> `readonly` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [domain/model.ts:102](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L102)

The shared ledger connection the custodian submits through.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [domain/model.ts:120](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L120)

How long to wait before handing control back to the caller.
