# Variable: SimpleXRPL

> `const` **SimpleXRPL**: \{ `init`: `Promise`\<[`SimpleXRPLClient`](../classes/SimpleXRPLClient.md)\>; \}

Defined in: [src/client/simple-xrpl.ts:8](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/client/simple-xrpl.ts#L8)

The SDK entry point. `SimpleXRPL.init(...)` is the only way to obtain a
[SimpleXRPLClient](../classes/SimpleXRPLClient.md); the client is never constructed via `new`.

## Type declaration

### init()

Bind custodians to a network and build the account index.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | [`SimpleXRPLConfig`](../interfaces/SimpleXRPLConfig.md) | Network endpoints and pre-constructed custodians. |

#### Returns

`Promise`\<[`SimpleXRPLClient`](../classes/SimpleXRPLClient.md)\>

A ready client.
