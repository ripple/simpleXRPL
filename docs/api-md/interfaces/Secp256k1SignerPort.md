# Interface: Secp256k1SignerPort

Defined in: [custodians/external/external-signer-port.ts:26](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L26)

A secp256k1 external signer (e.g. AWS KMS, most PKCS#11 HSMs).

## Properties

### algorithm

> `readonly` **algorithm**: `"secp256k1"`

Defined in: [custodians/external/external-signer-port.ts:28](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L28)

The signature scheme this key uses.

***

### publicKey()

> `readonly` **publicKey**: () => `Promise`\<`string`\>

Defined in: [custodians/external/external-signer-port.ts:36](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L36)

The signer's public key as an XRPL-format compressed hex string (33 bytes,
`02`/`03` prefix).

#### Returns

`Promise`\<`string`\>

The compressed public key hex.

***

### signDigest()

> `readonly` **signDigest**: (`digest`) => `Promise`\<[`EcdsaSignature`](EcdsaSignature.md)\>

Defined in: [custodians/external/external-signer-port.ts:47](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L47)

Sign a 32-byte digest — XRPL's SHA-512Half of the signing data — returning
the raw `{ r, s }` scalars. Adapters parse their provider's native format
(DER for KMS, raw `r‖s` for PKCS#11) into scalars; the SDK normalizes to
low-S and DER-encodes before attaching the signature.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `digest` | `Uint8Array` | The 32-byte digest to sign. |

#### Returns

`Promise`\<[`EcdsaSignature`](EcdsaSignature.md)\>

The signature scalars.
