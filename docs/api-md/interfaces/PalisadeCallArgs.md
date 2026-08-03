# Interface: PalisadeCallArgs\<Op\>

Defined in: custodians/palisade/api.ts:39

The typed arguments for one operation: path params, query, and/or body.

## Type Parameters

| Type Parameter |
| ------ |
| `Op` *extends* [`PalisadeOperationId`](../type-aliases/PalisadeOperationId.md) |

## Properties

### body?

> `readonly` `optional` **body**: `RequestBody`\<`Op`\>

Defined in: custodians/palisade/api.ts:42

***

### path?

> `readonly` `optional` **path**: `PathParams`\<`Op`\>

Defined in: custodians/palisade/api.ts:40

***

### query?

> `readonly` `optional` **query**: `QueryParams`\<`Op`\>

Defined in: custodians/palisade/api.ts:41
