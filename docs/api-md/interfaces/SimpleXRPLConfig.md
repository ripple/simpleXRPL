# Interface: SimpleXRPLConfig

Defined in: [client/config.ts:9](https://github.com/ripple/simpleXRPL/blob/main/src/client/config.ts#L9)

Configuration for [SimpleXRPL.init](../variables/SimpleXRPL.md#init). Custodians are pre-constructed and
already authenticated (each via its own `create()` / `fromEnv()`); `init`
only binds them to a network and builds the account index.

## Properties

### faucetUrl?

> `readonly` `optional` **faucetUrl**: `string`

Defined in: [client/config.ts:14](https://github.com/ripple/simpleXRPL/blob/main/src/client/config.ts#L14)

Faucet endpoint, used on test networks only.

***

### ledger?

> `readonly` `optional` **ledger**: [`LedgerPort`](LedgerPort.md)

Defined in: [client/config.ts:29](https://github.com/ripple/simpleXRPL/blob/main/src/client/config.ts#L29)

Ledger connection used for reads, autofill, and Local/raw submission.
Defaults to an `XrplLedger` built from `xrpldUrl`; inject a fake in tests.

***

### primarySigner?

> `readonly` `optional` **primarySigner**: [`Custodian`](Custodian.md)

Defined in: [client/config.ts:23](https://github.com/ripple/simpleXRPL/blob/main/src/client/config.ts#L23)

The default signer for operations called without an explicit account. Defaults to `signers[0]`.

***

### signers?

> `readonly` `optional` **signers**: readonly [`Custodian`](Custodian.md)[]

Defined in: [client/config.ts:20](https://github.com/ripple/simpleXRPL/blob/main/src/client/config.ts#L20)

Pre-constructed custodians. Omit for a no-signer client that can still read
the ledger; write operations then throw `NoSignerError` until a signer is added.

***

### xrpldUrl

> `readonly` **xrpldUrl**: `string`

Defined in: [client/config.ts:11](https://github.com/ripple/simpleXRPL/blob/main/src/client/config.ts#L11)

The xrpld endpoint (`ws(s)://` or `http(s)://`).
