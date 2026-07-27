# Interface: LocalSignerFromEnvOptions

Defined in: [custodians/local/local-signer.ts:31](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/local/local-signer.ts#L31)

Options for [LocalSigner.fromEnv](../classes/LocalSigner.md#fromenv).

## Properties

### env?

> `readonly` `optional` **env**: `Readonly`\<`Record`\<`string`, `undefined` \| `string`\>\>

Defined in: [custodians/local/local-signer.ts:36](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/local/local-signer.ts#L36)

Environment source to scan. Defaults to `process.env`.

***

### primary?

> `readonly` `optional` **primary**: `string`

Defined in: [custodians/local/local-signer.ts:33](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/local/local-signer.ts#L33)

The primary account's r-address. Defaults to the first seed in scan order.
