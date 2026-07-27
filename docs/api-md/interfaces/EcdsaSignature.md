# Interface: EcdsaSignature

Defined in: [custodians/external/external-signer-port.ts:15](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/external/external-signer-port.ts#L15)

A secp256k1 signature as its raw curve scalars.

## Properties

### r

> `readonly` **r**: `bigint`

Defined in: [custodians/external/external-signer-port.ts:17](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/external/external-signer-port.ts#L17)

The `r` scalar.

***

### s

> `readonly` **s**: `bigint`

Defined in: [custodians/external/external-signer-port.ts:19](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/custodians/external/external-signer-port.ts#L19)

The `s` scalar (the SDK normalizes it to the low half of the curve).
