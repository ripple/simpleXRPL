# Interface: SignedEnvelope

Defined in: [domain/model.ts:67](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L67)

A signed transaction ready to submit to xrpld.

## Properties

### hash?

> `readonly` `optional` **hash**: `string`

Defined in: [domain/model.ts:72](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L72)

The transaction hash, when the backend returns it.

***

### txBlob

> `readonly` **txBlob**: `string`

Defined in: [domain/model.ts:69](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/domain/model.ts#L69)

The signed transaction blob (hex).
