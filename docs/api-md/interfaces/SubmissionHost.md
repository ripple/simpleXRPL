# Interface: SubmissionHost

Defined in: [pipeline/host.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/host.ts#L9)

The subset of the client the pipeline depends on. `SimpleXRPLClient`
implements it; verticals receive it so the pipeline stays decoupled from the
concrete client (avoids an import cycle).

## Properties

### ledger

> `readonly` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [pipeline/host.ts:11](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/host.ts#L11)

The shared ledger connection for autofill and Local/raw submission.

***

### pollMptIssuanceId()?

> `optional` **pollMptIssuanceId**: (`intentId`) => `Promise`\<`string`\>

Defined in: [pipeline/host.ts:40](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/host.ts#L40)

Poll the custodian's transaction layer until the on-chain transaction linked
to `intentId` is confirmed, then return its MPT issuance ID. Present only
when the primary signer supports custody-side transaction observation (e.g.
Ripple Custody). `Token.issue` uses this to deterministically recover the
issuance ID without querying the XRPL ledger.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The intent/order ID to look up. |

#### Returns

`Promise`\<`string`\>

The MPT issuance ID, or an empty string on timeout.

***

### primaryAddress()

> **primaryAddress**: () => `undefined` \| `string`

Defined in: [pipeline/host.ts:28](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/host.ts#L28)

The primary signer's account address, or `undefined` on a no-signer client.
Read methods use this as the default account to query; it never throws, so
reads stay available without credentials (the caller passes an address).

#### Returns

`undefined` \| `string`

***

### registerLocalAccount()

> **registerLocalAccount**: (`seed`) => [`Account`](Account.md)

Defined in: [pipeline/host.ts:21](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/host.ts#L21)

Register a locally-signed account at runtime so subsequent operations can act on
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

Defined in: [pipeline/host.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/pipeline/host.ts#L14)

Resolve the account an operation acts on.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `selector`? | [`AccountSelector`](../type-aliases/AccountSelector.md) |

#### Returns

[`Account`](Account.md)
