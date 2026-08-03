/**
 * The external-signer seam (TDD §9): a key held outside the process — in a KMS
 * (AWS/GCP) or an HSM (PKCS#11, CloudHSM) — that signs on request without ever
 * releasing the private key. Adapters translate their provider's native calls
 * to this narrow port; the SDK owns the XRPL-specific assembly (signing digest,
 * low-S normalization, DER encoding, and serialization).
 *
 * The port is a discriminated union on `algorithm`, because the two XRPL
 * signature schemes need different inputs and outputs:
 * - **secp256k1** signs a 32-byte digest and yields raw `{ r, s }` scalars;
 * - **ed25519** signs the message bytes directly and yields a 64-byte signature.
 */

/** A secp256k1 signature as its raw curve scalars. */
export interface EcdsaSignature {
  /** The `r` scalar. */
  readonly r: bigint
  /** The `s` scalar (the SDK normalizes it to the low half of the curve). */
  readonly s: bigint
}

/** The signature scheme the external key uses. */
export type ExternalSignerAlgorithm = 'secp256k1' | 'ed25519'

/** A secp256k1 external signer (e.g. AWS KMS, most PKCS#11 HSMs). */
export interface Secp256k1SignerPort {
  /** The signature scheme this key uses. */
  readonly algorithm: 'secp256k1'

  /**
   * The signer's public key as an XRPL-format compressed hex string (33 bytes,
   * `02`/`03` prefix).
   *
   * @returns The compressed public key hex.
   */
  readonly publicKey: () => Promise<string>

  /**
   * Sign a 32-byte digest — XRPL's SHA-512Half of the signing data — returning
   * the raw `{ r, s }` scalars. Adapters parse their provider's native format
   * (DER for KMS, raw `r‖s` for PKCS#11) into scalars; the SDK normalizes to
   * low-S and DER-encodes before attaching the signature.
   *
   * @param digest - The 32-byte digest to sign.
   * @returns The signature scalars.
   */
  readonly signDigest: (digest: Uint8Array) => Promise<EcdsaSignature>
}

/** An ed25519 external signer (e.g. GCP KMS, some HSMs). */
export interface Ed25519SignerPort {
  /** The signature scheme this key uses. */
  readonly algorithm: 'ed25519'

  /**
   * The signer's public key as an XRPL-format hex string (33 bytes: the `ED`
   * prefix followed by the 32-byte raw key).
   *
   * @returns The `ED`-prefixed public key hex.
   */
  readonly publicKey: () => Promise<string>

  /**
   * Sign the message bytes directly — ed25519 hashes internally, so there is no
   * pre-digest and no low-S step. Return the raw 64-byte signature; the SDK
   * hex-encodes it.
   *
   * @param message - The signing-data bytes (from `encodeForSigning`).
   * @returns The raw 64-byte signature.
   */
  readonly signMessage: (message: Uint8Array) => Promise<Uint8Array>
}

/**
 * A remote signer backed by a KMS or HSM. One port instance signs for one key
 * (one XRPL account).
 */
export type ExternalSignerPort = Secp256k1SignerPort | Ed25519SignerPort
