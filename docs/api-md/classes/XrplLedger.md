# Class: XrplLedger

Defined in: [ledger/xrpl-ledger.ts:20](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L20)

The production [LedgerPort](../interfaces/LedgerPort.md), wrapping an `xrpl` WebSocket client. Reads,
autofill, and Local/raw submission all flow through the one shared client.

## Implements

- [`LedgerPort`](../interfaces/LedgerPort.md)

## Constructors

### new XrplLedger()

> **new XrplLedger**(`xrpldUrl`, `faucetUrl`?): [`XrplLedger`](XrplLedger.md)

Defined in: [ledger/xrpl-ledger.ts:31](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L31)

Wrap a new xrpl client bound to the given endpoint.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `xrpldUrl` | `string` | The xrpld WebSocket endpoint. |
| `faucetUrl`? | `string` | The faucet endpoint (testnet/devnet), enabling `fund`. |

#### Returns

[`XrplLedger`](XrplLedger.md)

## Methods

### autofill()

> **autofill**(`tx`): `Promise`\<`Transaction`\>

Defined in: [ledger/xrpl-ledger.ts:86](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L86)

Fill network-derived fields (sequence, fee, last ledger sequence).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The transaction to complete. |

#### Returns

`Promise`\<`Transaction`\>

The autofilled transaction.

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`autofill`](../interfaces/LedgerPort.md#autofill)

***

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [ledger/xrpl-ledger.ts:67](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L67)

Open the connection, if the implementation is connection-oriented.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`connect`](../interfaces/LedgerPort.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [ledger/xrpl-ledger.ts:74](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L74)

Close the connection, if the implementation is connection-oriented.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`disconnect`](../interfaces/LedgerPort.md#disconnect)

***

### fundViaFaucet()

> **fundViaFaucet**(`address`): `Promise`\<`void`\>

Defined in: [ledger/xrpl-ledger.ts:42](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L42)

Faucet-fund an address, resolving once it exists on-ledger. Present only on
networks with a faucet (testnet/devnet); absent implementations mean
`Account.fund` is unavailable and callers should use `Account.activate`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `address` | `string` | The r-address to fund. |

#### Returns

`Promise`\<`void`\>

#### Throws

[SimpleXRPLError](SimpleXRPLError.md) if no faucet is configured or funding fails.

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`fundViaFaucet`](../interfaces/LedgerPort.md#fundviafaucet)

***

### request()

> **request**\<`T`\>(`req`): `Promise`\<`T`\>

Defined in: [ledger/xrpl-ledger.ts:122](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L122)

Issue a raw ledger request and resolve with the typed response.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `req` | [`LedgerRequest`](../interfaces/LedgerRequest.md) | The ledger request. |

#### Returns

`Promise`\<`T`\>

The typed response.

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`request`](../interfaces/LedgerPort.md#request)

***

### submit()

> **submit**(`signedTxBlob`): `Promise`\<`SubmitResponse`\>

Defined in: [ledger/xrpl-ledger.ts:100](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L100)

Submit a signed transaction blob.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `signedTxBlob` | `string` | The signed transaction blob (hex). |

#### Returns

`Promise`\<`SubmitResponse`\>

The submit response.

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`submit`](../interfaces/LedgerPort.md#submit)

***

### submitAndWait()

> **submitAndWait**(`signedTxBlob`): `Promise`\<`TxResponse`\<`Transaction`\>\>

Defined in: [ledger/xrpl-ledger.ts:111](https://github.com/ripple/simpleXRPL/blob/main/src/ledger/xrpl-ledger.ts#L111)

Submit a signed blob and wait for the transaction to reach terminal state.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `signedTxBlob` | `string` | The signed transaction blob (hex). |

#### Returns

`Promise`\<`TxResponse`\<`Transaction`\>\>

The transaction response.

#### Implementation of

[`LedgerPort`](../interfaces/LedgerPort.md).[`submitAndWait`](../interfaces/LedgerPort.md#submitandwait)
