# Interface: LocalSignerFromEnvOptions

Defined in: [src/custodians/local/local-signer.ts:31](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/local/local-signer.ts#L31)

Options for [LocalSigner.fromEnv](../classes/LocalSigner.md#fromenv).

## Properties

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [src/custodians/local/local-signer.ts:36](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/local/local-signer.ts#L36)

Environment source to scan. Defaults to `process.env`.

***

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [src/custodians/local/local-signer.ts:33](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/custodians/local/local-signer.ts#L33)

The primary account's r-address. Defaults to the first seed in scan order.
