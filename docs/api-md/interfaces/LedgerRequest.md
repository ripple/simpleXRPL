# Interface: LedgerRequest

Defined in: [ports/ledger.ts:6](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L6)

A raw ledger request, mirroring the shape the xrpl.js client accepts.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [ports/ledger.ts:11](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L11)

The rippled command, e.g. `'account_info'`.
