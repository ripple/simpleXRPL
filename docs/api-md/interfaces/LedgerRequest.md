# Interface: LedgerRequest

Defined in: [ports/ledger.ts:6](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/ledger.ts#L6)

A raw ledger request, mirroring the shape the xrpl.js client accepts.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [ports/ledger.ts:11](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/ledger.ts#L11)

The rippled command, e.g. `'account_info'`.
