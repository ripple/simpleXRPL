# Variable: PALISADE\_NATIVE\_TRANSACTORS

> `const` **PALISADE\_NATIVE\_TRANSACTORS**: `ReadonlySet`\<[`TransactorType`](../type-aliases/TransactorType.md)\>

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:18](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/mapping/submit-operations.ts#L18)

The XRPL transactors Palisade models on a native `Submit*`/transfer path —
the custodian's `nativeOps` set. Keep in sync with [txToNativeSubmit](../functions/txToNativeSubmit.md);
a transactor here with no case there would route native and then throw.
