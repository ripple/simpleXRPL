# Interface: NativeSubmit

Defined in: [custodians/palisade/mapping/submit-operations.ts:32](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/palisade/mapping/submit-operations.ts#L32)

A native submission: the wallet-relative sub-path and its typed JSON body.

## Properties

### body

> `readonly` **body**: `unknown`

Defined in: [custodians/palisade/mapping/submit-operations.ts:36](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/palisade/mapping/submit-operations.ts#L36)

The typed Palisade request body.

***

### subPath

> `readonly` **subPath**: `string`

Defined in: [custodians/palisade/mapping/submit-operations.ts:34](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/palisade/mapping/submit-operations.ts#L34)

The wallet-relative op sub-path (e.g. `transfer`, `xrp/trust-set`).
