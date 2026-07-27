# Interface: SignedEnvelope

Defined in: [domain/model.ts:67](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/domain/model.ts#L67)

A signed transaction ready to submit to rippled.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [domain/model.ts:72](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/domain/model.ts#L72)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [domain/model.ts:69](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/domain/model.ts#L69)

The signed transaction blob (hex).
