import { createHash, sign } from 'node:crypto'

import { CustodyAuthError } from '../../../../errors.js'
import type { KeypairStrategy } from '../keypairs.types.js'

/** Hex chars representing the first 32-byte half (r) of the raw signature. */
const HALF_SIGNATURE_HEX_LEN = 64
/** Hex chars representing the full 64-byte raw Ed25519 signature. */
const FULL_SIGNATURE_HEX_LEN = 128
/** DER INTEGERs are two's-complement; this bit marks a value as negative. */
const DER_INTEGER_SIGN_BIT = 0x80
/** Base used to render byte values as hex. */
const HEX_RADIX = 16

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
 * DER-encode a 32-byte unsigned big-endian integer half of the raw signature,
 * prefixing the 0x00 pad byte ASN.1 requires whenever the high bit is set
 * (otherwise the value is read back as negative).
 *
 * @param halfHex - 32-byte (64 hex char) unsigned integer, big-endian.
 * @returns The DER INTEGER TLV (tag + length + content), as hex.
 */
function derEncodeInteger(halfHex: string): string {
  const needsPad =
    parseInt(halfHex.substring(0, 2), HEX_RADIX) >= DER_INTEGER_SIGN_BIT
  const content = needsPad ? `00${halfHex}` : halfHex
  const lengthHex = (content.length / 2).toString(HEX_RADIX).padStart(2, '0')
  return `02${lengthHex}${content}`
}

/**
 * Ed25519 signer.
 *
 * This reproduces Ripple Custody's documented OpenSSL flow EXACTLY, including a
 * non-obvious DER step — do not "simplify" it without a contract test verifying
 * the exact bytes Custody expects:
 *
 * 1. If the message is a serialized JSON object (an intent body), SHA-256 hash it
 *    first; if it is a bare token (challenge UUID / JWT), sign the bytes as-is.
 * 2. Produce the raw 64-byte Ed25519 signature.
 * 3. Re-wrap that raw signature as `30 44 02 20 <r> 02 20 <s>` — i.e. treat the
 *    two 32-byte halves as ECDSA-style (r, s) integers and DER-encode them.
 *
 * Step 3 is NOT standard Ed25519 (Ed25519 signatures are raw 64 bytes, not DER),
 * but it is what the Custody server verifies against per its openssl-examples
 * doc. Matching the server is the contract. Faithful port of the Ripple Custody
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
    const rDer = derEncodeInteger(rHex)
    const sDer = derEncodeInteger(sHex)
    const sequenceLengthHex = ((rDer.length + sDer.length) / 2)
      .toString(HEX_RADIX)
      .padStart(2, '0')
    const derHex = `30${sequenceLengthHex}${rDer}${sDer}`

    return Buffer.from(derHex, 'hex').toString('base64')
  }
}
