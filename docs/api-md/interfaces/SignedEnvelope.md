# Interface: SignedEnvelope

Defined in: [domain/model.ts:87](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L87)

A signed transaction ready to submit to xrpld.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [domain/model.ts:92](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L92)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [domain/model.ts:89](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L89)

The signed transaction blob (hex).
