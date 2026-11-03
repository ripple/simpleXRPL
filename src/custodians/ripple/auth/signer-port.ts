/**
 * The seam for keeping the Ripple Custody API user's private key outside the
 * process — in an HSM or a KMS. That key does two jobs: it signs the login
 * challenge Custody exchanges for an access token, and it signs every intent
 * the SDK proposes. Passing a {@link CustodySignerPort} as `auth.signer`
 * instead of `auth.signingKey` routes both through the port, so the private key
 * never enters the process.
 *
 * The port runs only the raw signing primitive. The SDK owns everything around
 * it: choosing and hashing the bytes to sign, encoding the signature the way
 * Custody expects, and checking each signature against the public key before
 * it is sent.
 */

/** The key algorithms Ripple Custody supports for an API user. */
export type CustodyKeyAlgorithm = 'secp256k1' | 'secp256r1' | 'ed25519'

/**
 * What a signature is for, so an HSM or KMS policy can treat the two
 * differently (e.g. require extra approval for intents):
 *
 * - `auth-challenge` — the one-time challenge exchanged for an access token;
 * - `intent` — an intent request the SDK proposes to Custody.
 */
export type CustodySignContext = 'auth-challenge' | 'intent'

/**
 * A Custody API user key held in an HSM or KMS. One port signs for one key.
 *
 * What `sign` receives and must return depends on the key's algorithm:
 *
 * - **secp256k1, secp256r1:** `data` is a 32-byte SHA-256 digest. Sign it as a
 *   digest, without hashing it again — e.g. AWS KMS `MessageType: DIGEST` with
 *   `ECDSA_SHA_256`, or PKCS#11 `CKM_ECDSA`. Return the DER-encoded ECDSA
 *   signature.
 * - **ed25519:** `data` is the exact bytes to sign (already hashed by the SDK
 *   where Custody requires it). Return the raw 64-byte signature.
 */
export interface CustodySignerPort {
  /** The key's algorithm. */
  readonly algorithm: CustodyKeyAlgorithm
  /**
   * The key's public half — the public key registered for the Custody API
   * user — as base64 SPKI DER or a PEM `PUBLIC KEY` block. Read once, when the
   * custodian is created.
   *
   * @returns The public key.
   */
  readonly publicKey: () => Promise<string>
  /**
   * Run the raw signing primitive over `data` (see the table above).
   *
   * @param data - The bytes to sign.
   * @param context - What the signature is for.
   * @returns The signature: DER for ECDSA, 64 raw bytes for ed25519.
   */
  readonly sign: (
    data: Uint8Array,
    context: CustodySignContext,
  ) => Promise<Uint8Array>
}
