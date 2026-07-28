# Interface: SubmissionContext

Defined in: [domain/model.ts:90](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L90)

Per-submission context threaded through the pipeline to the custodian.

## Properties

### account

> `readonly` **account**: [`Account`](Account.md)

Defined in: [domain/model.ts:92](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L92)

The resolved source account the transaction acts on.

***

### async?

> `readonly` `optional` **async**: `boolean`

Defined in: [domain/model.ts:104](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L104)

Return a handle instead of blocking until the transaction is terminal.

***

### customProperties?

> `readonly` `optional` **customProperties**: `Record`\<`string`, `unknown`\>

Defined in: [domain/model.ts:110](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L110)

Human-readable approval metadata stamped on custody intents.

***

### dryRun?

> `readonly` `optional` **dryRun**: `boolean`

Defined in: [domain/model.ts:101](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L101)

Pre-flight the write through the backend's dry-run, where supported.

***

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [domain/model.ts:98](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L98)

Optional fee override; falls back to the custodian's configured default.

***

### idempotencyKey?

> `readonly` `optional` **idempotencyKey**: `string`

Defined in: [domain/model.ts:107](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L107)

Stable, client-generated id that makes a retry resolve to the same intent.

***

### ledger

> `readonly` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [domain/model.ts:95](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L95)

The shared ledger connection the custodian submits through.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs**: `number`

Defined in: [domain/model.ts:113](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L113)

How long to wait before handing control back to the caller.
