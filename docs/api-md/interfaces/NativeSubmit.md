# Interface: NativeSubmit

Defined in: [custodians/palisade/mapping/submit-operations.ts:32](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/palisade/mapping/submit-operations.ts#L32)

A native submission: the wallet-relative sub-path and its typed JSON body.

## Properties

### body

> `readonly` **body**: `unknown`

Defined in: [custodians/palisade/mapping/submit-operations.ts:36](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/palisade/mapping/submit-operations.ts#L36)

The typed Palisade request body.

***

### subPath

> `readonly` **subPath**: `string`

Defined in: [custodians/palisade/mapping/submit-operations.ts:34](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/palisade/mapping/submit-operations.ts#L34)

The wallet-relative op sub-path (e.g. `transfer`, `xrp/trust-set`).
