/** The three signing algorithms Ripple Custody supports for the intent-author key. */
export type KeypairAlgorithm = 'secp256k1' | 'secp256r1' | 'ed25519'

/** A signer strategy for one algorithm. */
export interface KeypairStrategy {
  /**
   * Sign `message` with the PEM-encoded private key.
   *
   * @param privateKeyPem - PEM-encoded private key.
   * @param message - The message to sign (a challenge nonce or canonicalized JSON).
   * @returns The base64-encoded signature in the encoding Custody expects.
   */
  sign: (privateKeyPem: string, message: string) => string
}
