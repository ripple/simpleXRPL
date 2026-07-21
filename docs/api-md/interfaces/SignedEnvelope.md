# Interface: SignedEnvelope

Defined in: [src/domain/model.ts:63](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L63)

A signed transaction ready to submit to rippled.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [src/domain/model.ts:68](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L68)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [src/domain/model.ts:65](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L65)

The signed transaction blob (hex).
