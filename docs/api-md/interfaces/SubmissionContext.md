# Interface: SubmissionContext

Defined in: [src/domain/model.ts:86](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L86)

Per-submission context threaded through the pipeline to the custodian.

## Properties

### account

> `readonly` **account**: [`Account`](Account.md)

Defined in: [src/domain/model.ts:88](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L88)

The resolved source account the transaction acts on.

***

### async?

> `readonly` `optional` **async**: `boolean`

Defined in: [src/domain/model.ts:100](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L100)

Return a handle instead of blocking until the transaction is terminal.

***

### customProperties?

> `readonly` `optional` **customProperties**: `Record`\<`string`, `unknown`\>

Defined in: [src/domain/model.ts:106](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L106)

Human-readable approval metadata stamped on custody intents.

***

### dryRun?

> `readonly` `optional` **dryRun**: `boolean`

Defined in: [src/domain/model.ts:97](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L97)

Pre-flight the write through the backend's dry-run, where supported.

***

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/domain/model.ts:94](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L94)

Optional fee override; falls back to the custodian's configured default.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [src/domain/model.ts:103](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L103)

Stable, client-generated id that makes a retry resolve to the same intent.

***

### ledger

> `readonly` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [src/domain/model.ts:91](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L91)

The shared ledger connection the custodian submits through.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [src/domain/model.ts:109](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L109)

How long to wait before handing control back to the caller.
