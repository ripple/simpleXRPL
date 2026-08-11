# Interface: SignedEnvelope

Defined in: [domain/model.ts:77](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L77)

A signed transaction ready to submit to xrpld.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [domain/model.ts:82](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L82)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [domain/model.ts:79](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L79)

The signed transaction blob (hex).
