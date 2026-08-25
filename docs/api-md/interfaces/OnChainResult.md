# Interface: OnChainResult

Defined in: [domain/model.ts:308](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L308)

The on-chain outcome of a custodian-submitted transaction, available once
the ledger has confirmed it. Returned by OnChainObserver.awaitOnChain
and surfaced via `client.intent.awaitOnChain`.

## Properties

### mptIssuanceId?

> `readonly` `optional` **mptIssuanceId**: `string`

Defined in: [domain/model.ts:312](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L312)

Present when the transaction created an MPT issuance.

***

### txHash

> `readonly` **txHash**: `string`

Defined in: [domain/model.ts:310](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L310)

The XRPL transaction hash.
