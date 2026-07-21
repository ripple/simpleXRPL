# Interface: LedgerRequest

Defined in: [src/ports/ledger.ts:6](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/ledger.ts#L6)

A raw ledger request, mirroring the shape the xrpl.js client accepts.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [src/ports/ledger.ts:11](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/ledger.ts#L11)

The rippled command, e.g. `'account_info'`.
