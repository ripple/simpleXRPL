# Interface: LedgerRequest

Defined in: [src/ports/ledger.ts:6](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/ledger.ts#L6)

A raw ledger request, mirroring the shape the xrpl.js client accepts.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [src/ports/ledger.ts:11](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/ledger.ts#L11)

The rippled command, e.g. `'account_info'`.
