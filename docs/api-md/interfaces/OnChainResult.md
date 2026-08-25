# Interface: OnChainResult

Defined in: [domain/model.ts:276](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L276)

The on-chain outcome of a custodian-submitted transaction, available once
the ledger has confirmed it. Returned by OnChainObserver.awaitOnChain
and surfaced via `client.intent.awaitOnChain`.

## Properties

### mptIssuanceId?

> `readonly` `optional` **mptIssuanceId**: `string`

Defined in: [domain/model.ts:280](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L280)

Present when the transaction created an MPT issuance.

***

### txHash

> `readonly` **txHash**: `string`

Defined in: [domain/model.ts:278](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L278)

The XRPL transaction hash.
