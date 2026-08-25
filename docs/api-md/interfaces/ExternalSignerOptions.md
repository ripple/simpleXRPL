# Interface: ExternalSignerOptions

Defined in: [custodians/external/external-signer.ts:23](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/external/external-signer.ts#L23)

Options for [ExternalSigner.create](../classes/ExternalSigner.md#create).

## Properties

### address?

> `readonly` `optional` **address**: `string`

Defined in: [custodians/external/external-signer.ts:32](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/external/external-signer.ts#L32)

The r-address to act as. Defaults to the address derived from the signer's
public key (i.e. the key is the account's master key). Provide it when the
key is a regular key for a different account.

***

### signer

> `readonly` **signer**: [`ExternalSignerPort`](../type-aliases/ExternalSignerPort.md)

Defined in: [custodians/external/external-signer.ts:25](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/external/external-signer.ts#L25)

The KMS/HSM-backed signer for one key.
