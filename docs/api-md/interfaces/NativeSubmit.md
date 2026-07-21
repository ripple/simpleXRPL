# Interface: NativeSubmit

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:30](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/palisade/mapping/submit-operations.ts#L30)

A native submission: the wallet-relative sub-path and its typed JSON body.

## Properties

### body

> `readonly` **body**: `unknown`

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:34](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/palisade/mapping/submit-operations.ts#L34)

The typed Palisade request body.

***

### subPath

> `readonly` **subPath**: `string`

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:32](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/palisade/mapping/submit-operations.ts#L32)

The wallet-relative op sub-path (e.g. `transfer`, `xrp/trust-set`).
