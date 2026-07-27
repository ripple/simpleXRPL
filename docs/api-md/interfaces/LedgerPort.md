# Interface: LedgerPort

Defined in: [ports/ledger.ts:18](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L18)

The subset of the xrpl.js client the SDK depends on, injected so the local
and raw-signing paths can run against an in-memory ledger in tests.

## Properties

### autofill()

> `readonly` **autofill**: (`tx`) => `Promise`\<`Transaction`\>

Defined in: [ports/ledger.ts:20](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L20)

Fill network-derived fields (sequence, fee, last ledger sequence).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tx` | `Transaction` |

#### Returns

`Promise`\<`Transaction`\>

***

### connect()?

> `readonly` `optional` **connect**: () => `Promise`\<`void`\>

Defined in: [ports/ledger.ts:39](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L39)

Open the connection, if the implementation is connection-oriented.

#### Returns

`Promise`\<`void`\>

***

### disconnect()?

> `readonly` `optional` **disconnect**: () => `Promise`\<`void`\>

Defined in: [ports/ledger.ts:42](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L42)

Close the connection, if the implementation is connection-oriented.

#### Returns

`Promise`\<`void`\>

***

### fundViaFaucet()?

> `readonly` `optional` **fundViaFaucet**: (`address`) => `Promise`\<`void`\>

Defined in: [ports/ledger.ts:36](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L36)

Faucet-fund an address, resolving once it exists on-ledger. Present only on
networks with a faucet (testnet/devnet); absent implementations mean
`Account.fund` is unavailable and callers should use `Account.activate`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `string` |

#### Returns

`Promise`\<`void`\>

***

### request()

> `readonly` **request**: \<`T`\>(`req`) => `Promise`\<`T`\>

Defined in: [ports/ledger.ts:29](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L29)

Issue a raw ledger request and resolve with the typed response.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`LedgerRequest`](LedgerRequest.md) |

#### Returns

`Promise`\<`T`\>

***

### submit()

> `readonly` **submit**: (`signedTxBlob`) => `Promise`\<`SubmitResponse`\>

Defined in: [ports/ledger.ts:23](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L23)

Submit a signed transaction blob.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `signedTxBlob` | `string` |

#### Returns

`Promise`\<`SubmitResponse`\>

***

### submitAndWait()

> `readonly` **submitAndWait**: (`signedTxBlob`) => `Promise`\<`TxResponse`\<`Transaction`\>\>

Defined in: [ports/ledger.ts:26](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/ledger.ts#L26)

Submit a signed blob and wait for the transaction to reach terminal state.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `signedTxBlob` | `string` |

#### Returns

`Promise`\<`TxResponse`\<`Transaction`\>\>
