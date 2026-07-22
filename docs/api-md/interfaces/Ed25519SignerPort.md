# Interface: Ed25519SignerPort

Defined in: [custodians/external/external-signer-port.ts:51](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L51)

An ed25519 external signer (e.g. GCP KMS, some HSMs).

## Properties

### algorithm

> `readonly` **algorithm**: `"ed25519"`

Defined in: [custodians/external/external-signer-port.ts:53](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L53)

The signature scheme this key uses.

***

### publicKey()

> `readonly` **publicKey**: () => `Promise`\<`string`\>

Defined in: [custodians/external/external-signer-port.ts:61](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L61)

The signer's public key as an XRPL-format hex string (33 bytes: the `ED`
prefix followed by the 32-byte raw key).

#### Returns

`Promise`\<`string`\>

The `ED`-prefixed public key hex.

***

### signMessage()

> `readonly` **signMessage**: (`message`) => `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [custodians/external/external-signer-port.ts:71](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/custodians/external/external-signer-port.ts#L71)

Sign the message bytes directly — ed25519 hashes internally, so there is no
pre-digest and no low-S step. Return the raw 64-byte signature; the SDK
hex-encodes it.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `Uint8Array` | The signing-data bytes (from `encodeForSigning`). |

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

The raw 64-byte signature.
