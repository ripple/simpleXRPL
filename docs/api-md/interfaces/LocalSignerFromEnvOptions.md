# Interface: LocalSignerFromEnvOptions

Defined in: [custodians/local/local-signer.ts:33](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L33)

Options for [LocalSigner.fromEnv](../classes/LocalSigner.md#fromenv).

## Properties

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [custodians/local/local-signer.ts:38](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L38)

Environment source to scan. Defaults to `process.env`.

***

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [custodians/local/local-signer.ts:35](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/local/local-signer.ts#L35)

The primary account's r-address. Defaults to the first seed in scan order.
