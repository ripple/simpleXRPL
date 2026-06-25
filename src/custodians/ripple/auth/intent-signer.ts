import canonicalizeImport from 'canonicalize'

import { CustodyAuthError } from '../../../core/errors.js'

import type { KeypairService } from './keypair.service.js'

// `canonicalize` ships as CJS `module.exports = fn`. A default import resolves
// to that function at runtime in both the ESM and CJS builds, but its bundled
// `export default` typing isn't callable under NodeNext — coerce it once here.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- See comment above; runtime value is the function.
const canonicalize = canonicalizeImport as unknown as (
  input: unknown,
) => string | undefined

/**
 * Signs Custody intent bodies (TDD §7.2).
 *
 * Every `v0_CreateTransactionOrder` / `v0_SignManifest` envelope carries a
 * `request` object and a detached `signature` over the *canonicalized* request.
 * Canonicalization (RFC 8785 / JCS) guarantees the SDK and the Custody server
 * agree on byte-for-byte JSON before signing, regardless of key order.
 *
 * This is the primitive DGE-7464 calls once it has built the envelope; it does
 * not construct the envelope itself.
 */
export class IntentSigner {
  private readonly keypair: KeypairService
  private readonly privateKey: string

  /**
   * Construct an IntentSigner.
   *
   * @param keypair - The algorithm-bound signer for the intent-author key.
   * @param privateKey - The PEM-encoded intent-author private key.
   */
  public constructor(keypair: KeypairService, privateKey: string) {
    this.keypair = keypair
    this.privateKey = privateKey
  }

  /**
   * Canonicalize `request` and return its base64 signature. Pure: does not
   * mutate the input.
   *
   * @param request - The intent request object to sign.
   * @returns The base64-encoded signature over the canonicalized request.
   * @throws {@link CustodyAuthError} if the request cannot be canonicalized.
   */
  public signRequest(request: unknown): string {
    const canonical = canonicalize(request)
    if (canonical === undefined) {
      throw new CustodyAuthError(
        'Failed to canonicalize Custody intent request body',
      )
    }
    return this.keypair.sign(this.privateKey, canonical)
  }

  /**
   * Return a shallow copy of `envelope` with `signature` populated from its
   * `request`. Leaves an already-signed envelope untouched.
   *
   * @param envelope - An envelope carrying a `request` and optional `signature`.
   * @returns The envelope with a guaranteed `signature`.
   */
  public signEnvelope<T extends { request: unknown; signature?: string }>(
    envelope: T,
  ): T & { signature: string } {
    const signature =
      envelope.signature !== undefined && envelope.signature !== ''
        ? envelope.signature
        : this.signRequest(envelope.request)
    return { ...envelope, signature }
  }
}
