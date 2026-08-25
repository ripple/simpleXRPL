# Interface: NativeSubmit

Defined in: [custodians/palisade/mapping/submit-operations.ts:59](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/mapping/submit-operations.ts#L59)

A native submission: the wallet-relative sub-path and its typed JSON body.

## Properties

### body

> `readonly` **body**: `unknown`

Defined in: [custodians/palisade/mapping/submit-operations.ts:63](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/mapping/submit-operations.ts#L63)

The typed Palisade request body.

***

### subPath

> `readonly` **subPath**: `string`

Defined in: [custodians/palisade/mapping/submit-operations.ts:61](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/mapping/submit-operations.ts#L61)

The wallet-relative op sub-path (e.g. `transfer`, `xrp/trust-set`).
