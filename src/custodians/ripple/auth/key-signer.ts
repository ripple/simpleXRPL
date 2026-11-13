/* eslint-disable max-classes-per-file -- The interface's two implementations: in-process key and external port. */
import { createHash, createPublicKey, verify } from 'node:crypto'
import type { KeyObject } from 'node:crypto'

import { CustodyAuthError, SimpleXRPLError } from '../../../errors.js'

import { encodeEd25519Signature } from './algorithms/ed25519.service.js'
import { KeypairService } from './keypair.service.js'
import type {
  CustodyKeyAlgorithm,
  CustodySignContext,
  CustodySignerPort,
} from './signer-port.js'

/** Length of a raw Ed25519 signature. */
const ED25519_SIGNATURE_BYTES = 64

/** The first byte of a DER `SEQUENCE`, which every DER ECDSA signature is. */
const DER_SEQUENCE = 0x30

/**
 * Signs messages with the Custody API user's key, whichever way it is held.
 * Both the login challenge and intent signing go through this, so the two can
 * never use different keys.
 *
 * Internal: callers configure a key with `auth.signingKey` or `auth.signer`.
 */
export interface CustodyKeySigner {
  /** The key's algorithm. */
  readonly algorithm: CustodyKeyAlgorithm
  /** The public key as base64 SPKI DER — the form Custody's login expects. */
  readonly publicKeyBase64: string
  /**
   * Sign `message` the way Custody verifies it.
   *
   * @param message - The challenge, or the canonicalized intent request.
   * @param context - What the signature is for.
   * @returns The base64 signature, in the encoding Custody expects.
   */
  sign: (message: string, context: CustodySignContext) => Promise<string>
}

/**
 * A key held in process, as a PEM private key (`auth.signingKey`).
 */
export class LocalKeySigner implements CustodyKeySigner {
  public readonly algorithm: CustodyKeyAlgorithm
  public readonly publicKeyBase64: string
  private readonly keypair: KeypairService

  /**
   * The private key. A real JS private field, so it is absent from
   * `console.log`, `util.inspect` and `JSON.stringify` output.
   */
  readonly #privateKey: string

  /**
   * Construct from a parsed key.
   *
   * @param keypair - The algorithm-bound signing strategy.
   * @param privateKeyPem - The PEM private key.
   */
  private constructor(keypair: KeypairService, privateKeyPem: string) {
    this.keypair = keypair
    this.algorithm = keypair.algorithm
    this.#privateKey = privateKeyPem
    this.publicKeyBase64 = KeypairService.derivePublicKeyBase64(privateKeyPem)
  }

  /**
   * Build a signer from a PEM private key, detecting its algorithm.
   *
   * @param privateKeyPem - The Custody API user's PEM private key.
   * @returns The signer.
   * @throws {@link CustodyAuthError} if the key can't be parsed or uses an
   *   algorithm Custody doesn't support.
   */
  public static fromPrivateKey(privateKeyPem: string): LocalKeySigner {
    return new LocalKeySigner(
      KeypairService.fromPrivateKey(privateKeyPem),
      privateKeyPem,
    )
  }

  /**
   * Sign with the in-process key.
   *
   * @param message - The message to sign.
   * @returns The base64 signature.
   */
  public async sign(message: string): Promise<string> {
    return this.keypair.sign(this.#privateKey, message)
  }
}

/**
 * Parse the port's public key: base64 SPKI DER, or a PEM `PUBLIC KEY` block.
 *
 * @param publicKey - The public key the port returned.
 * @returns The parsed key.
 * @throws {@link CustodyAuthError} if it doesn't parse.
 */
function parsePublicKey(publicKey: string): KeyObject {
  try {
    return publicKey.includes('-----BEGIN')
      ? createPublicKey(publicKey)
      : createPublicKey({
          key: Buffer.from(publicKey, 'base64'),
          format: 'der',
          type: 'spki',
        })
  } catch (error) {
    throw new CustodyAuthError(
      "Could not parse the Custody signer's public key. Expected base64 SPKI " +
        'DER or a PEM PUBLIC KEY block.',
      { cause: error },
    )
  }
}

/**
 * The algorithm a parsed public key is for.
 *
 * @param key - The parsed public key.
 * @returns The algorithm, or `undefined` if Custody doesn't support it.
 */
function algorithmOf(key: KeyObject): CustodyKeyAlgorithm | undefined {
  if (key.asymmetricKeyType === 'ed25519') {
    return 'ed25519'
  }
  const curve = key.asymmetricKeyDetails?.namedCurve
  if (key.asymmetricKeyType === 'ec' && curve === 'secp256k1') {
    return 'secp256k1'
  }
  if (key.asymmetricKeyType === 'ec' && curve === 'prime256v1') {
    return 'secp256r1'
  }
  return undefined
}

/**
 * A key held in an HSM or KMS, reached through a {@link CustodySignerPort}
 * (`auth.signer`). The SDK prepares the bytes the port signs, checks the
 * signature it returns against the public key, and encodes it for Custody.
 */
export class PortKeySigner implements CustodyKeySigner {
  public readonly algorithm: CustodyKeyAlgorithm
  public readonly publicKeyBase64: string
  private readonly port: CustodySignerPort
  private readonly publicKey: KeyObject

  /**
   * Construct from a port and its verified public key.
   *
   * @param port - The signer port.
   * @param publicKey - The port's parsed public key.
   */
  private constructor(port: CustodySignerPort, publicKey: KeyObject) {
    this.port = port
    this.algorithm = port.algorithm
    this.publicKey = publicKey
    this.publicKeyBase64 = publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64')
  }

  /**
   * Build a signer over a port, reading and checking its public key.
   *
   * @param port - The signer port.
   * @returns The signer.
   * @throws {@link CustodyAuthError} if the public key doesn't parse, or isn't
   *   a key for the port's declared algorithm.
   */
  public static async create(port: CustodySignerPort): Promise<PortKeySigner> {
    let publicKeyText: string
    try {
      publicKeyText = await port.publicKey()
    } catch (error) {
      throw new CustodyAuthError(
        'The Custody signer failed to return its public key',
        { cause: error },
      )
    }
    const publicKey = parsePublicKey(publicKeyText)
    const keyAlgorithm = algorithmOf(publicKey)
    if (keyAlgorithm !== port.algorithm) {
      throw new CustodyAuthError(
        `The Custody signer declares ${port.algorithm}, but its public key is ` +
          `${keyAlgorithm ?? 'not a secp256k1, secp256r1 or ed25519 key'}.`,
      )
    }
    return new PortKeySigner(port, publicKey)
  }

  /**
   * Sign through the port. ECDSA keys sign the message's SHA-256 digest;
   * Ed25519 keys sign the challenge as-is and an intent's SHA-256 digest —
   * Custody's scheme for each.
   *
   * @param message - The message to sign.
   * @param context - What the signature is for.
   * @returns The base64 signature, in the encoding Custody expects.
   * @throws {@link CustodyAuthError} if the port fails, or returns a signature
   *   that is malformed or doesn't verify against the public key.
   */
  public async sign(
    message: string,
    context: CustodySignContext,
  ): Promise<string> {
    const messageBytes = Buffer.from(message, 'utf8')
    const isEd25519 = this.algorithm === 'ed25519'
    const data =
      isEd25519 && context === 'auth-challenge'
        ? messageBytes
        : createHash('sha256').update(messageBytes).digest()

    const signature = await this.runPort(data, context)
    this.assertWellFormed(signature)
    // Check before sending: a wrong key or format would otherwise surface as an
    // unexplained 401 from Custody.
    const valid = isEd25519
      ? verify(null, data, this.publicKey, signature)
      : verify('sha256', messageBytes, this.publicKey, signature)
    if (!valid) {
      const hint = isEd25519
        ? ''
        : ', treating `data` as a SHA-256 digest (not hashing it again)'
      throw new CustodyAuthError(
        `The Custody signer's ${context} signature does not verify against ` +
          `its public key. Check the port signs with the matching private key${hint}.`,
      )
    }
    return isEd25519
      ? encodeEd25519Signature(signature)
      : Buffer.from(signature).toString('base64')
  }

  /**
   * Call the port, wrapping its failures.
   *
   * @param data - The bytes to sign.
   * @param context - What the signature is for.
   * @returns The port's signature.
   * @throws {@link CustodyAuthError} if the port throws.
   */
  private async runPort(
    data: Uint8Array,
    context: CustodySignContext,
  ): Promise<Uint8Array> {
    try {
      return await this.port.sign(data, context)
    } catch (error) {
      throw new CustodyAuthError(
        `The Custody signer failed to sign the ${context}`,
        { cause: error },
      )
    }
  }

  /**
   * Reject a signature that can't be the shape the algorithm produces.
   *
   * @param signature - The port's signature.
   * @throws {@link CustodyAuthError} if it is malformed.
   */
  private assertWellFormed(signature: unknown): asserts signature is Buffer {
    if (!(signature instanceof Uint8Array) || signature.length === 0) {
      throw new CustodyAuthError(
        'The Custody signer returned no signature; expected a non-empty Uint8Array.',
      )
    }
    if (
      this.algorithm === 'ed25519' &&
      signature.length !== ED25519_SIGNATURE_BYTES
    ) {
      throw new CustodyAuthError(
        `The Custody signer returned a ${signature.length}-byte ed25519 ` +
          'signature; expected the raw 64 bytes.',
      )
    }
    if (this.algorithm !== 'ed25519' && signature[0] !== DER_SEQUENCE) {
      throw new CustodyAuthError(
        `The Custody signer returned a ${this.algorithm} signature that is ` +
          'not DER-encoded.',
      )
    }
  }
}

/**
 * Resolve the API user's key from auth options that give it exactly one way:
 * `signingKey` (a PEM held in process) or `signer` (an HSM/KMS port).
 *
 * @param auth - The key options.
 * @param auth.signingKey - The PEM private key, if held in process.
 * @param auth.signer - The HSM/KMS port, if not.
 * @returns The key signer.
 * @throws {@link SimpleXRPLError} if both or neither are given.
 * @throws {@link CustodyAuthError} if the key or signer is unusable.
 */
export async function resolveKeySigner(auth: {
  readonly signingKey?: string
  readonly signer?: CustodySignerPort
}): Promise<CustodyKeySigner> {
  // The public options type already rules out both and neither; these checks
  // are for JavaScript callers, whom the types don't reach.
  if (auth.signer !== undefined && auth.signingKey !== undefined) {
    throw new SimpleXRPLError(
      'RippleCustody auth takes either signingKey or signer, not both',
    )
  }
  if (auth.signer !== undefined) {
    return PortKeySigner.create(auth.signer)
  }
  if (auth.signingKey === undefined) {
    throw new SimpleXRPLError(
      'RippleCustody auth needs the API user key: signingKey (PEM) or signer (HSM/KMS)',
    )
  }
  return LocalKeySigner.fromPrivateKey(auth.signingKey)
}
