# Interface: LedgerRequest

Defined in: [ports/ledger.ts:6](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/ports/ledger.ts#L6)

A raw ledger request, mirroring the shape the xrpl.js client accepts.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### command

> `readonly` **command**: `string`

Defined in: [ports/ledger.ts:11](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/ports/ledger.ts#L11)

The xrpld command, e.g. `'account_info'`.
