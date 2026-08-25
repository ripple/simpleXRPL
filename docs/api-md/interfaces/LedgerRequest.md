# Interface: LedgerRequest

Defined in: [ports/ledger.ts:6](https://github.com/ripple/simpleXRPL/blob/main/src/ports/ledger.ts#L6)

A raw ledger request, mirroring the shape the xrpl client accepts.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [ports/ledger.ts:11](https://github.com/ripple/simpleXRPL/blob/main/src/ports/ledger.ts#L11)

The xrpld command, e.g. `'account_info'`.
