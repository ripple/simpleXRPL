# Interface: LocalSignerFromEnvOptions

Defined in: [custodians/local/local-signer.ts:32](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L32)

Options for [LocalSigner.fromEnv](../classes/LocalSigner.md#fromenv).

## Properties

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [custodians/local/local-signer.ts:37](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L37)

Environment source to scan. Defaults to `process.env`.

***

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [custodians/local/local-signer.ts:34](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L34)

The primary account's r-address. Defaults to the first seed in scan order.
