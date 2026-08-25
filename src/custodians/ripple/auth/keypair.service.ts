import { createPrivateKey, createPublicKey } from 'node:crypto'

import { CustodyAuthError } from '../../../errors.js'

import {
  Secp256k1Service,
  Secp256r1Service,
} from './algorithms/ecdsa.service.js'
import { Ed25519Service } from './algorithms/ed25519.service.js'
import type { KeypairAlgorithm, KeypairStrategy } from './keypairs.types.js'

/**
 * Try to parse `privateKey` as a private key, for algorithm detection only.
 * PEM strings self-describe their encoding; DER buffers don't, so both
 * PKCS#8 and SEC1 are attempted (Ed25519 keys are always PKCS#8).
 *
 * @param privateKey - The private key (PEM string or DER buffer).
 * @returns The parsed key, or `null` if it doesn't parse as any known encoding.
 */
function tryParsePrivateKey(
  privateKey: string | Buffer,
): ReturnType<typeof createPrivateKey> | null {
  if (typeof privateKey === 'string') {
    try {
      return createPrivateKey(privateKey)
    } catch {
      return null
    }
  }
  for (const type of ['pkcs8', 'sec1'] as const) {
    try {
      return createPrivateKey({ key: privateKey, format: 'der', type })
    } catch {
      // Try the next DER encoding.
    }
  }
  return null
}

/**
 * Unified signing facade over the three Custody-supported algorithms. The
 * algorithm is auto-detected from the key (the caller never declares it).
 */
export class KeypairService {
  /** The algorithm this instance is bound to. */
  public readonly algorithm: KeypairAlgorithm

  /** Signer strategy per supported algorithm. */
  private readonly strategies: Record<KeypairAlgorithm, KeypairStrategy> = {
    secp256k1: new Secp256k1Service(),
    secp256r1: new Secp256r1Service(),
    ed25519: new Ed25519Service(),
  }

  /**
   * Construct a KeypairService bound to a specific algorithm.
   *
   * @param algorithm - The signing algorithm to use.
   */
  public constructor(algorithm: KeypairAlgorithm) {
    this.algorithm = algorithm
  }

  /**
   * Build a service by auto-detecting the algorithm from a PEM/DER private key.
   *
   * @param privateKey - The intent-author private key (PEM string or DER buffer).
   * @returns A service bound to the detected algorithm.
   * @throws {@link CustodyAuthError} if the key cannot be parsed, or parses
   *   but uses an algorithm Custody does not support.
   */
  public static fromPrivateKey(privateKey: string | Buffer): KeypairService {
    const algorithm = KeypairService.detectKeyType(privateKey)
    if (algorithm === 'unknown') {
      // Distinguish the two ways detection fails. Collapsing both into one
      // "unsupported algorithm" message sent at least one CI investigation
      // looking at the key's curve when the real problem was that the PEM's
      // newlines had been escaped in transit and it never parsed at all.
      throw new CustodyAuthError(
        tryParsePrivateKey(privateKey) === null
          ? 'Could not parse the intent-author private key. Expected PEM or ' +
              'DER contents; check the value is a complete key and that its ' +
              'newlines survived any environment-variable or secret-store ' +
              'round-trip.'
          : 'Unsupported private key algorithm. Expected a secp256k1, ' +
              'secp256r1 (prime256v1), or ed25519 key.',
      )
    }
    return new KeypairService(algorithm)
  }

  /**
   * Detect the key algorithm by matching the OID in the DER encoding.
   *
   * @param privateKey - The private key (PEM string or DER buffer).
   * @returns The detected algorithm, or `'unknown'`.
   */
  public static detectKeyType(
    privateKey: string | Buffer,
  ): KeypairAlgorithm | 'unknown' {
    const key = tryParsePrivateKey(privateKey)
    if (key === null) {
      return 'unknown'
    }
    if (key.asymmetricKeyType === 'ed25519') {
      return 'ed25519'
    }
    if (key.asymmetricKeyType === 'ec') {
      const namedCurve = key.asymmetricKeyDetails?.namedCurve
      if (namedCurve === 'secp256k1') {
        return 'secp256k1'
      }
      if (namedCurve === 'prime256v1') {
        return 'secp256r1'
      }
    }
    return 'unknown'
  }

  /**
   * Derive the registered public key (base64 DER / SPKI) from the private key.
   * Used when the caller omits `auth.publicKey`.
   *
   * @param privateKeyPem - PEM-encoded private key.
   * @returns The matching public key, base64-encoded SPKI DER.
   * @throws {@link CustodyAuthError} if the key cannot be parsed.
   */
  public static derivePublicKeyBase64(privateKeyPem: string): string {
    try {
      const pub = createPublicKey(createPrivateKey(privateKeyPem))
      return pub.export({ type: 'spki', format: 'der' }).toString('base64')
    } catch (error) {
      throw new CustodyAuthError(
        'Failed to derive public key from the provided private key',
        { cause: error },
      )
    }
  }

  /**
   * Sign `message` with `privateKeyPem` using the detected algorithm.
   *
   * @param privateKeyPem - PEM-encoded private key.
   * @param message - The message to sign.
   * @returns The base64-encoded signature.
   */
  public sign(privateKeyPem: string, message: string): string {
    return this.strategies[this.algorithm].sign(privateKeyPem, message)
  }
}
