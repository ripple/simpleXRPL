# Interface: ExternalSignerOptions

Defined in: [custodians/external/external-signer.ts:21](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/external/external-signer.ts#L21)

Options for [ExternalSigner.create](../classes/ExternalSigner.md#create).

## Properties

### address?

> `readonly` `optional` **address**: `string`

Defined in: [custodians/external/external-signer.ts:30](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/external/external-signer.ts#L30)

The r-address to act as. Defaults to the address derived from the signer's
public key (i.e. the key is the account's master key). Provide it when the
key is a regular key for a different account.

***

### signer

> `readonly` **signer**: [`ExternalSignerPort`](../type-aliases/ExternalSignerPort.md)

Defined in: [custodians/external/external-signer.ts:23](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/external/external-signer.ts#L23)

The KMS/HSM-backed signer for one key.
