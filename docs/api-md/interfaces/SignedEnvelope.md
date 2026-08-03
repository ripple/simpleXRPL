# Interface: SignedEnvelope

Defined in: [domain/model.ts:74](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L74)

A signed transaction ready to submit to xrpld.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [domain/model.ts:79](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L79)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [domain/model.ts:76](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L76)

The signed transaction blob (hex).
