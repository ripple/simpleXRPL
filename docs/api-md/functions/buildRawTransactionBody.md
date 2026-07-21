# Function: buildRawTransactionBody()

> **buildRawTransactionBody**(`encodedTransaction`, `externalId`?): \{ `blockchain`: `"AVALANCHE"` \| `"ETHEREUM"` \| `"XRP_LEDGER"` \| `"POLYGON"` \| `"BNBCHAIN"` \| `"BASE"` \| `"HEDERA"` \| `"ARBITRUM"` \| `"ONE_MONEY"` \| `"SOLANA"` \| `"TRON"` \| `"BITCOIN"`; `encodedTransaction`: `string`; `externalId`: `string`; `signOnly`: `boolean`; \}

Defined in: [src/custodians/palisade/mapping/raw.ts:14](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/palisade/mapping/raw.ts#L14)

Build the `RawTransaction` (sign-only) body: Palisade signs the encoded blob,
and the SDK submits the returned signed transaction through the shared ledger.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encodedTransaction` | `string` | The binary-codec-encoded XRPL transaction (hex). |
| `externalId`? | `string` | Optional idempotency key. |

## Returns

\{ `blockchain`: `"AVALANCHE"` \| `"ETHEREUM"` \| `"XRP_LEDGER"` \| `"POLYGON"` \| `"BNBCHAIN"` \| `"BASE"` \| `"HEDERA"` \| `"ARBITRUM"` \| `"ONE_MONEY"` \| `"SOLANA"` \| `"TRON"` \| `"BITCOIN"`; `encodedTransaction`: `string`; `externalId`: `string`; `signOnly`: `boolean`; \}

The raw-transaction request body.

### blockchain?

> `optional` **blockchain**: `"AVALANCHE"` \| `"ETHEREUM"` \| `"XRP_LEDGER"` \| `"POLYGON"` \| `"BNBCHAIN"` \| `"BASE"` \| `"HEDERA"` \| `"ARBITRUM"` \| `"ONE_MONEY"` \| `"SOLANA"` \| `"TRON"` \| `"BITCOIN"`

### encodedTransaction

> **encodedTransaction**: `string`

#### Description

The encoded transaction. Note that this must be encoded in the relevant blockchain format. RLP encoded for EVM chains. Binary codec encoding for XRP. Maximum size is 200KB.

#### Example

```ts
ed408505d21dba00825208942352d20fc81225c8ecd8f6faa1b37f24fed450c98089736f6d657468696e67808080
```

### externalId?

> `optional` **externalId**: `string`

#### Description

External ID of this transaction, unique to the organization

#### Example

```ts
ce4918bf-a199-4ce2-85a3-d0d296855384
```

### signOnly

> **signOnly**: `boolean`

#### Description

Whether to only sign the transaction, or also publish it to the blockchain

#### Example

```ts
true
```
