# Interface: OnChainResult

Defined in: [domain/model.ts:286](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L286)

The on-chain outcome of a custodian-submitted transaction, available once
the ledger has confirmed it. Returned by OnChainObserver.awaitOnChain
and surfaced via `client.intent.awaitOnChain`.

## Properties

### mptIssuanceId?

> `readonly` `optional` **mptIssuanceId**: `string`

Defined in: [domain/model.ts:290](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L290)

Present when the transaction created an MPT issuance.

***

### txHash

> `readonly` **txHash**: `string`

Defined in: [domain/model.ts:288](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L288)

The XRPL transaction hash.
