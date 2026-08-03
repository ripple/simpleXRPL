# Type Alias: ExternalSignerPort

> **ExternalSignerPort**: [`Secp256k1SignerPort`](../interfaces/Secp256k1SignerPort.md) \| [`Ed25519SignerPort`](../interfaces/Ed25519SignerPort.md)

Defined in: [custodians/external/external-signer-port.ts:78](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/external/external-signer-port.ts#L78)

A remote signer backed by a KMS or HSM. One port instance signs for one key
(one XRPL account).
