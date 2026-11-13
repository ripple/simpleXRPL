import { generateKeyPair } from 'node:crypto'
import { promisify } from 'node:util'

import { SimpleXRPLError } from '../../../errors.js'

import type { CustodyKeyAlgorithm } from './signer-port.js'

/** A new Ripple Custody API user key, as {@link generateCustodyKeypair} returns it. */
export interface CustodyKeypair {
  /** The key's algorithm. */
  readonly algorithm: CustodyKeyAlgorithm
  /**
   * The private key, PEM-encoded PKCS#8 (`-----BEGIN PRIVATE KEY-----`). Keep it
   * secret: it is what `auth.signingKey` / `RIPPLE_CUSTODY_AUTH_SIGNING_KEY`
   * take.
   */
  readonly privateKey: string
  /**
   * The public key, base64-encoded SPKI DER — the form Ripple Custody expects
   * when the API user is registered.
   */
  readonly publicKey: string
}

/** The curve Node names for each ECDSA algorithm. */
const NAMED_CURVES = {
  secp256k1: 'secp256k1',
  secp256r1: 'prime256v1',
} as const

const generateKeyPairAsync = promisify(generateKeyPair)

/** Every algorithm {@link generateCustodyKeypair} accepts. */
const ALGORITHMS: readonly CustodyKeyAlgorithm[] = [
  'ed25519',
  'secp256k1',
  'secp256r1',
]

/**
 * Generate a new key pair for a Ripple Custody API user, in any of the three
 * algorithms Custody supports. Register `publicKey` for the user in Custody,
 * and store `privateKey` where the SDK reads its signing key from (an
 * environment variable, a `.pem` file, or a secret manager).
 *
 * ```ts
 * const { privateKey, publicKey } = await generateCustodyKeypair('ed25519')
 * ```
 *
 * For a key held in an HSM or KMS, generate it there instead and pass a
 * `CustodySignerPort`; the private key then never exists outside the device.
 *
 * @param algorithm - `'ed25519'`, `'secp256k1'`, or `'secp256r1'`.
 * @returns The PEM private key and the base64 public key.
 * @throws {@link SimpleXRPLError} for an algorithm Custody doesn't support.
 */
export async function generateCustodyKeypair(
  algorithm: CustodyKeyAlgorithm,
): Promise<CustodyKeypair> {
  // Guard for JavaScript callers, whose `algorithm` the type doesn't check.
  if (!ALGORITHMS.includes(algorithm)) {
    throw new SimpleXRPLError(
      `Unsupported Custody key algorithm '${String(algorithm)}'; expected one of ${ALGORITHMS.join(', ')}`,
    )
  }
  const privateKeyEncoding = { type: 'pkcs8', format: 'pem' } as const
  const publicKeyEncoding = { type: 'spki', format: 'der' } as const
  const { privateKey, publicKey } =
    algorithm === 'ed25519'
      ? await generateKeyPairAsync('ed25519', {
          privateKeyEncoding,
          publicKeyEncoding,
        })
      : await generateKeyPairAsync('ec', {
          namedCurve: NAMED_CURVES[algorithm],
          privateKeyEncoding,
          publicKeyEncoding,
        })
  return { algorithm, privateKey, publicKey: publicKey.toString('base64') }
}
