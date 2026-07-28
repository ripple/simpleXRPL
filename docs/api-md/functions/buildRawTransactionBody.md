# Function: buildRawTransactionBody()

> **buildRawTransactionBody**(`encodedTransaction`, `externalId`?): \{\}

Defined in: [custodians/palisade/mapping/raw.ts:14](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/custodians/palisade/mapping/raw.ts#L14)

Build the `RawTransaction` (sign-only) body: Palisade signs the encoded blob,
and the SDK submits the returned signed transaction through the shared ledger.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encodedTransaction` | `string` | The binary-codec-encoded XRPL transaction (hex). |
| `externalId`? | `string` | Optional idempotency key. |

## Returns

\{\}

The raw-transaction request body.
