import { createPrivateKey, createPublicKey } from 'node:crypto'

import { CustodyAuthError } from '../../../core/errors.js'

import {
  Secp256k1Service,
  Secp256r1Service,
} from './algorithms/ecdsa.service.js'
import { Ed25519Service } from './algorithms/ed25519.service.js'
import type { KeypairAlgorithm, KeypairStrategy } from './keypairs.types.js'

// OID byte sequences (hex) embedded in a key's DER encoding, used to detect the
// algorithm without the caller declaring it (TDD §3.3).
// OID 1.3.101.112
const OID_ED25519 = '2b6570'
// OID 1.3.132.0.10
const OID_SECP256K1 = '2b8104000a'
// OID 1.2.840.10045.3.1.7
const OID_SECP256R1 = '2a8648ce3d030107'

/**
 * Unified signing facade over the three Custody-supported algorithms. The
 * algorithm is auto-detected from the key (the caller never declares it).
 */
export class KeypairService {
  /** Signer strategy per supported algorithm. */
  private readonly strategies: Record<KeypairAlgorithm, KeypairStrategy> = {
    secp256k1: new Secp256k1Service(),
    secp256r1: new Secp256r1Service(),
    ed25519: new Ed25519Service(),
  }

  private readonly algorithm: KeypairAlgorithm

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
   * @throws {@link CustodyAuthError} if the algorithm cannot be determined.
   */
  public static fromPrivateKey(privateKey: string | Buffer): KeypairService {
    const algorithm = KeypairService.detectKeyType(privateKey)
    if (algorithm === 'unknown') {
      throw new CustodyAuthError(
        'Unsupported or unrecognized private key algorithm. Expected a ' +
          'PEM/DER secp256k1, secp256r1, or ed25519 key.',
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
    let hex: string
    if (typeof privateKey === 'string') {
      const base64 = privateKey
        .replace(/-----(?:BEGIN|END)[\s\S]+?-----/gu, '')
        .replace(/\s+/gu, '')
      hex = Buffer.from(base64, 'base64').toString('hex')
    } else {
      hex = privateKey.toString('hex')
    }

    if (hex.includes(OID_ED25519)) {
      return 'ed25519'
    }
    if (hex.includes(OID_SECP256K1)) {
      return 'secp256k1'
    }
    if (hex.includes(OID_SECP256R1)) {
      return 'secp256r1'
    }
    return 'unknown'
  }

  /**
   * Derive the registered public key (base64 DER / SPKI) from the private key.
   * Used when the caller omits `auth.publicKey` (TDD §3.3).
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
