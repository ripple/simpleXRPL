# Interface: SubmissionHost

Defined in: [src/pipeline/host.ts:9](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/host.ts#L9)

The subset of the client the pipeline depends on. `SimpleXRPLClient`
implements it; verticals receive it so the pipeline stays decoupled from the
concrete client (avoids an import cycle).

## Properties

### ledger

> `readonly` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [src/pipeline/host.ts:11](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/host.ts#L11)

The shared ledger connection for autofill and Local/raw submission.

***

### registerLocalAccount()

> **registerLocalAccount**: (`seed`) => [`Account`](Account.md)

Defined in: [src/pipeline/host.ts:21](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/host.ts#L21)

Register a locally-signed account at runtime so subsequent verbs can act on
it. Used by `Account.create` to make a freshly generated account usable
(e.g. by `Account.fund` / `Account.activate`).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | `string` |

#### Returns

[`Account`](Account.md)

***

### resolveAccount()

> **resolveAccount**: (`selector`?) => [`Account`](Account.md)

Defined in: [src/pipeline/host.ts:14](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/pipeline/host.ts#L14)

Resolve the account a verb acts on.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `selector`? | [`AccountSelector`](../type-aliases/AccountSelector.md) |

#### Returns

[`Account`](Account.md)
