# Interface: SignedEnvelope

Defined in: [src/domain/model.ts:63](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L63)

A signed transaction ready to submit to rippled.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [src/domain/model.ts:68](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L68)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [src/domain/model.ts:65](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L65)

The signed transaction blob (hex).
