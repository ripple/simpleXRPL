/* eslint-disable max-classes-per-file -- One abstract base plus its two curve subclasses. */
import { createPrivateKey, sign } from 'node:crypto'

import { CustodyAuthError } from '../../../../errors.js'
import type { KeypairStrategy } from '../keypairs.types.js'

/**
 * Shared ECDSA signer for the two EC curves Custody supports. Signs the raw
 * message bytes and returns a base64 DER signature. Faithful port of custody.js
 * `Secp256k1Service` / `Secp256r1Service`.
 */
abstract class EcdsaService implements KeypairStrategy {
  /** OpenSSL curve name as Node reports it in `asymmetricKeyDetails.namedCurve`. */
  protected abstract readonly nodeCurve: string
  /** Human-facing algorithm name used in error messages. */
  protected abstract readonly label: string

  /**
   * Sign the message with the PEM-encoded EC private key.
   *
   * @param privateKeyPem - PEM-encoded EC private key for this curve.
   * @param message - The message to sign.
   * @returns The base64-encoded DER signature.
   * @throws {@link CustodyAuthError} if the key or message is invalid.
   */
  public sign(privateKeyPem: string, message: string): string {
    if (typeof message !== 'string') {
      throw new CustodyAuthError('Message must be a string')
    }
    this.assertValidKey(privateKeyPem)

    const signature = sign(null, Buffer.from(message), {
      key: privateKeyPem,
      dsaEncoding: 'der',
    })
    return signature.toString('base64')
  }

  /**
   * Reject malformed, non-EC, or wrong-curve keys before signing.
   *
   * @param privateKeyPem - The candidate private key.
   * @throws {@link CustodyAuthError} if the key is not a valid key for this curve.
   */
  private assertValidKey(privateKeyPem: string): void {
    const invalid = `Invalid private key: must be a PEM-encoded ${this.label} private key`
    if (typeof privateKeyPem !== 'string') {
      throw new CustodyAuthError(invalid)
    }

    try {
      const key = createPrivateKey(privateKeyPem)
      const details = key.asymmetricKeyDetails
      if (
        key.asymmetricKeyType !== 'ec' ||
        (details !== undefined && details.namedCurve !== this.nodeCurve)
      ) {
        throw new CustodyAuthError(invalid)
      }
    } catch (error) {
      if (error instanceof CustodyAuthError) {
        throw error
      }
      throw new CustodyAuthError(
        `Invalid private key: failed to parse PEM-encoded ${this.label} private key`,
        { cause: error },
      )
    }
  }
}

/** secp256k1 signer (XRPL's default curve). */
export class Secp256k1Service extends EcdsaService {
  protected readonly nodeCurve = 'secp256k1'
  protected readonly label = 'secp256k1'
}

/** secp256r1 signer (NIST P-256; Node reports the curve as `prime256v1`). */
export class Secp256r1Service extends EcdsaService {
  protected readonly nodeCurve = 'prime256v1'
  protected readonly label = 'secp256r1'
}
