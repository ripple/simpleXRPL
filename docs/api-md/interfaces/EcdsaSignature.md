# Interface: EcdsaSignature

Defined in: [custodians/external/external-signer-port.ts:15](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/external/external-signer-port.ts#L15)

A secp256k1 signature as its raw curve scalars.

## Properties

### r

> `readonly` **r**: `bigint`

Defined in: [custodians/external/external-signer-port.ts:17](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/external/external-signer-port.ts#L17)

The `r` scalar.

***

### s

> `readonly` **s**: `bigint`

Defined in: [custodians/external/external-signer-port.ts:19](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/custodians/external/external-signer-port.ts#L19)

The `s` scalar (the SDK normalizes it to the low half of the curve).
