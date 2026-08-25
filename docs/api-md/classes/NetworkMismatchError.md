# Class: NetworkMismatchError

Defined in: [errors.ts:90](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L90)

An account exists at a custodian, but only on XRPL network(s) other than the
one the client is connected to. The SDK refuses to route a transaction to the
wrong network (which would silently strand it), so point the client's
`xrpldUrl` at a node on a matching network, or register the address on this
network at the custodian.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new NetworkMismatchError()

> **new NetworkMismatchError**(`account`, `clientNetworkId`, `availableNetworkIds`): [`NetworkMismatchError`](NetworkMismatchError.md)

Defined in: [errors.ts:103](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L103)

Construct a NetworkMismatchError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `account` | `string` | The r-address that has no record on the client's network. |
| `clientNetworkId` | `undefined` \| `number` | The network id the client is connected to, or `undefined` when it could not be determined. |
| `availableNetworkIds` | readonly `number`[] | The network ids the account does exist on. |

#### Returns

[`NetworkMismatchError`](NetworkMismatchError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### account

> `readonly` **account**: `string`

Defined in: [errors.ts:91](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L91)

***

### availableNetworkIds

> `readonly` **availableNetworkIds**: readonly `number`[]

Defined in: [errors.ts:93](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L93)

***

### clientNetworkId

> `readonly` **clientNetworkId**: `undefined` \| `number`

Defined in: [errors.ts:92](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L92)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
