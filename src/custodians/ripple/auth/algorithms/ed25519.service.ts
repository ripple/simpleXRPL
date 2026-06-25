import { createHash, sign } from 'node:crypto'

import { CustodyAuthError } from '../../../../core/errors.js'
import type { KeypairStrategy } from '../keypairs.types.js'

/** Hex chars representing the first 32-byte half (r) of the raw signature. */
const HALF_SIGNATURE_HEX_LEN = 64
/** Hex chars representing the full 64-byte raw Ed25519 signature. */
const FULL_SIGNATURE_HEX_LEN = 128

/**
 * Does this string look like a serialized JSON object/array (an intent body)
 * rather than a bare token such as a challenge UUID or a JWT?
 *
 * @param value - The message about to be signed.
 * @returns `true` when `value` parses as a JSON object or array.
 */
function isStringifiedObject(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false
  }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

/**
 * Ed25519 signer.
 *
 * This reproduces Ripple Custody's documented OpenSSL flow EXACTLY, including a
 * non-obvious DER step — do not "simplify" it without a contract test (DGE-7467):
 *
 * 1. If the message is a serialized JSON object (an intent body), SHA-256 hash it
 *    first; if it is a bare token (challenge UUID / JWT), sign the bytes as-is.
 * 2. Produce the raw 64-byte Ed25519 signature.
 * 3. Re-wrap that raw signature as `30 44 02 20 <r> 02 20 <s>` — i.e. treat the
 *    two 32-byte halves as ECDSA-style (r, s) integers and DER-encode them.
 *
 * Step 3 is NOT standard Ed25519 (Ed25519 signatures are raw 64 bytes, not DER),
 * but it is what the Custody server verifies against per its openssl-examples
 * doc. Matching the server is the contract. Faithful port of custody.js
 * `Ed25519Service`.
 */
export class Ed25519Service implements KeypairStrategy {
  /**
   * Sign the message with the PEM-encoded (PKCS#8) Ed25519 private key.
   *
   * @param privateKeyPem - PEM-encoded Ed25519 private key.
   * @param message - The message to sign (challenge/JWT signed as-is; JSON hashed).
   * @returns The base64-encoded, DER-wrapped signature Custody expects.
   * @throws {@link CustodyAuthError} if the key or message is invalid.
   */
  // eslint-disable-next-line class-methods-use-this -- Implements the stateless KeypairStrategy interface.
  public sign(privateKeyPem: string, message: string): string {
    if (typeof message !== 'string') {
      throw new CustodyAuthError('Message must be a string')
    }
    if (
      typeof privateKeyPem !== 'string' ||
      !privateKeyPem.includes('-----BEGIN PRIVATE KEY-----')
    ) {
      throw new CustodyAuthError(
        'Invalid private key: must be a PEM-encoded (PKCS#8) Ed25519 key',
      )
    }

    // Step 1: hash JSON bodies; pass bare tokens (challenge/JWT) through unchanged.
    const messageHash = isStringifiedObject(message)
      ? createHash('sha256').update(message).digest()
      : Buffer.from(message)

    // Step 2: raw 64-byte Ed25519 signature.
    const hexSignature = sign(null, messageHash, privateKeyPem).toString('hex')

    // Step 3: re-wrap the two halves as DER (see class doc — required by Custody).
    const rHex = hexSignature.substring(0, HALF_SIGNATURE_HEX_LEN)
    const sHex = hexSignature.substring(
      HALF_SIGNATURE_HEX_LEN,
      FULL_SIGNATURE_HEX_LEN,
    )
    const derHex = `30440220${rHex}0220${sHex}`

    return Buffer.from(derHex, 'hex').toString('base64')
  }
}
