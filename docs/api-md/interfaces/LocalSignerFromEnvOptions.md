# Interface: LocalSignerFromEnvOptions

Defined in: [src/custodians/local/local-signer.ts:31](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/local/local-signer.ts#L31)

Options for [LocalSigner.fromEnv](../classes/LocalSigner.md#fromenv).

## Properties

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [src/custodians/local/local-signer.ts:36](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/local/local-signer.ts#L36)

Environment source to scan. Defaults to `process.env`.

***

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [src/custodians/local/local-signer.ts:33](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/local/local-signer.ts#L33)

The primary account's r-address. Defaults to the first seed in scan order.
