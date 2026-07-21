/**
 * The external-signer seam (TDD §9): a key held outside the process — in a KMS
 * (AWS/GCP) or an HSM (PKCS#11, CloudHSM) — that signs on request without ever
 * releasing the private key. Adapters translate their provider's native calls
 * to this narrow port; the SDK owns the XRPL-specific assembly (signing digest,
 * low-S normalization, DER encoding, and serialization).
 */

/** A secp256k1 signature as its raw curve scalars. */
export interface EcdsaSignature {
  /** The `r` scalar. */
  readonly r: bigint
  /** The `s` scalar (the SDK normalizes it to the low half of the curve). */
  readonly s: bigint
}

/** The signature scheme the external key uses. Only secp256k1 today. */
export type ExternalSignerAlgorithm = 'secp256k1'

/**
 * A remote signer backed by a KMS or HSM. One port instance signs for one key
 * (one XRPL account).
 */
export interface ExternalSignerPort {
  /** The signature scheme this key uses. */
  readonly algorithm: ExternalSignerAlgorithm

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
