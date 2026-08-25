# Interface: NetworkInfo

Defined in: [client/client.ts:26](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L26)

The network a client is bound to.

## Properties

### faucetUrl?

> `readonly` `optional` **faucetUrl**: `string`

Defined in: [client/client.ts:31](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L31)

Faucet endpoint, used on test networks only.

***

### networkId?

> `readonly` `optional` **networkId**: `number`

Defined in: [client/client.ts:39](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L39)

The connected node's XRPL network id (`server_info` `network_id`: Mainnet
0, Testnet 1, Devnet 2), resolved at init when a custodian record is
network-scoped. `undefined` when no record needed it (so it was never
probed) or the probe could not reach the node.

***

### xrpldUrl

> `readonly` **xrpldUrl**: `string`

Defined in: [client/client.ts:28](https://github.com/ripple/simpleXRPL/blob/main/src/client/client.ts#L28)

The xrpld endpoint (`ws(s)://` or `http(s)://`).
