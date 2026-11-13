import canonicalizeImport from 'canonicalize'

import { CustodyAuthError } from '../../../errors.js'

import { LocalKeySigner } from './key-signer.js'
import type { CustodyKeySigner } from './key-signer.js'

// `canonicalize` ships as CJS `module.exports = fn`. A default import resolves
// to that function at runtime in both the ESM and CJS builds, but its bundled
// `export default` typing isn't callable under NodeNext — coerce it once here.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- See comment above; runtime value is the function.
const canonicalize = canonicalizeImport as unknown as (
  input: unknown,
) => string | undefined

/**
 * Signs Custody intent bodies.
 *
 * Every `v0_CreateTransactionOrder` / `v0_SignManifest` envelope carries a
 * `request` object and a detached `signature` over the *canonicalized* request.
 * Canonicalization (RFC 8785 / JCS) guarantees the SDK and the Custody server
 * agree on byte-for-byte JSON before signing, regardless of key order.
 *
 * This is the signing primitive that envelope-building code calls once it has
 * built the envelope; it does not construct the envelope itself.
 */
export class IntentSigner {
  private readonly keySigner: CustodyKeySigner

  /**
   * Construct an IntentSigner.
   *
   * @param keySigner - The API user key, however it is held (in process, HSM
   *   or KMS).
   */
  public constructor(keySigner: CustodyKeySigner) {
    this.keySigner = keySigner
  }

  /**
   * Build an IntentSigner over an in-process PEM key.
   *
   * @param privateKeyPem - The PEM-encoded intent-author private key.
   * @returns The signer.
   * @throws {@link CustodyAuthError} if the key can't be parsed or uses an
   *   unsupported algorithm.
   */
  public static fromPrivateKey(privateKeyPem: string): IntentSigner {
    return new IntentSigner(LocalKeySigner.fromPrivateKey(privateKeyPem))
  }

  /**
   * Canonicalize `request` and return its base64 signature. Pure: does not
   * mutate the input.
   *
   * @param request - The intent request object to sign.
   * @returns The base64-encoded signature over the canonicalized request.
   * @throws {@link CustodyAuthError} if the request cannot be canonicalized,
   *   or an HSM/KMS signer fails.
   */
  public async signRequest(request: unknown): Promise<string> {
    const canonical = canonicalize(request)
    if (canonical === undefined) {
      throw new CustodyAuthError(
        'Failed to canonicalize Custody intent request body',
      )
    }
    return this.keySigner.sign(canonical, 'intent')
  }

  /**
   * Return a shallow copy of `envelope` with `signature` populated from its
   * `request`. Leaves an already-signed envelope untouched.
   *
   * @param envelope - An envelope carrying a `request` and optional `signature`.
   * @returns The envelope with a guaranteed `signature`.
   */
  public async signEnvelope<T extends { request: unknown; signature?: string }>(
    envelope: T,
  ): Promise<T & { signature: string }> {
    const signature =
      envelope.signature !== undefined && envelope.signature !== ''
        ? envelope.signature
        : await this.signRequest(envelope.request)
    return { ...envelope, signature }
  }
}
