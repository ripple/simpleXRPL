# Interface: SignedEnvelope

Defined in: [src/domain/model.ts:63](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/domain/model.ts#L63)

A signed transaction ready to submit to rippled.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [src/domain/model.ts:68](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/domain/model.ts#L68)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [src/domain/model.ts:65](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/domain/model.ts#L65)

The signed transaction blob (hex).
