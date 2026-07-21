# Interface: NativeSubmit

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:32](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/palisade/mapping/submit-operations.ts#L32)

A native submission: the wallet-relative sub-path and its typed JSON body.

## Properties

### body

> `readonly` **body**: `unknown`

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:36](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/palisade/mapping/submit-operations.ts#L36)

The typed Palisade request body.

***

### subPath

> `readonly` **subPath**: `string`

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:34](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/palisade/mapping/submit-operations.ts#L34)

The wallet-relative op sub-path (e.g. `transfer`, `xrp/trust-set`).
