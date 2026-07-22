import { createPublicKey } from 'node:crypto'

import {
  GetPublicKeyCommand,
  KMSClient,
  SignCommand,
} from '@aws-sdk/client-kms'

import { SimpleXRPLError } from '../../../errors.js'
import type {
  EcdsaSignature,
  Secp256k1SignerPort,
} from '../external-signer-port.js'

/** DER INTEGER tag and the SEQUENCE/INTEGER header size (tag + 1-byte length). */
const DER_INTEGER = 0x02
const DER_HEADER = 2
/** Compressed-point prefixes: `02` for an even `y`, `03` for odd. */
const COMPRESSED_EVEN = 0x02
const COMPRESSED_ODD = 0x03
const EVEN = 2

/** Options for {@link AwsKmsSigner.create}. */
export interface AwsKmsSignerOptions {
  /** The KMS key id or ARN. Must be an ECC_SECG_P256K1 (secp256k1) key. */
  readonly keyId: string
  /** A pre-built KMS client. Provide one, or `region` to construct the default. */
  readonly client?: KMSClient
  /** AWS region, used when `client` is omitted. */
  readonly region?: string
}

/**
 * Read one DER INTEGER at `offset` from a signature buffer.
 *
 * @param buffer - The DER signature bytes.
 * @param offset - The INTEGER's tag offset.
 * @returns The scalar value and the offset just past it.
 * @throws {@link SimpleXRPLError} if the byte at `offset` is not an INTEGER tag.
 */
function readDerInteger(
  buffer: Buffer,
  offset: number,
): { value: bigint; next: number } {
  if (buffer[offset] !== DER_INTEGER) {
    throw new SimpleXRPLError('Malformed DER signature from AWS KMS')
  }
  const length = buffer[offset + 1]
  const start = offset + DER_HEADER
  const value = BigInt(
    `0x${buffer.subarray(start, start + length).toString('hex')}`,
  )
  return { value, next: start + length }
}

/**
 * Parse a DER-encoded ECDSA signature (`SEQUENCE { INTEGER r, INTEGER s }`)
 * into its scalars. secp256k1 signatures are short, so lengths are single-byte.
 *
 * @param der - The DER signature bytes.
 * @returns The `{ r, s }` scalars.
 */
function derToScalars(der: Uint8Array): EcdsaSignature {
  const buffer = Buffer.from(der)
  const first = readDerInteger(buffer, DER_HEADER)
  const second = readDerInteger(buffer, first.next)
  return { r: first.value, s: second.value }
}

/**
 * Compress an SPKI-DER secp256k1 public key to XRPL's 33-byte hex form. Uses
 * `node:crypto` to parse the point, then applies the `02`/`03` parity prefix.
 *
 * @param spki - The SPKI-DER public key from KMS `GetPublicKey`.
 * @returns The uppercase compressed public key hex.
 * @throws {@link SimpleXRPLError} if the key is not an EC key.
 */
function spkiToCompressedHex(spki: Uint8Array): string {
  const jwk = createPublicKey({
    key: Buffer.from(spki),
    format: 'der',
    type: 'spki',
  }).export({ format: 'jwk' })
  if (jwk.x === undefined || jwk.y === undefined) {
    throw new SimpleXRPLError('AWS KMS public key is not an EC key')
  }
  const x = Buffer.from(jwk.x, 'base64url')
  const y = Buffer.from(jwk.y, 'base64url')
  const prefix = y[y.length - 1] % EVEN === 0 ? COMPRESSED_EVEN : COMPRESSED_ODD
  return Buffer.concat([Buffer.from([prefix]), x])
    .toString('hex')
    .toUpperCase()
}

/**
 * An {@link Secp256k1SignerPort} backed by AWS KMS: the private key stays in
 * KMS and never enters the process. Pair it with `ExternalSigner.create` to
 * sign XRPL transactions. Requires the optional peer dependency
 * `@aws-sdk/client-kms` and an `ECC_SECG_P256K1` KMS key.
 */
export class AwsKmsSigner implements Secp256k1SignerPort {
  public readonly algorithm = 'secp256k1'

  private readonly client: KMSClient
  private readonly keyId: string

  private constructor(client: KMSClient, keyId: string) {
    this.client = client
    this.keyId = keyId
  }

  /**
   * Build an AWS KMS signer.
   *
   * @param options - The key id and either a client or a region.
   * @returns The signer port.
   */
  public static create(options: AwsKmsSignerOptions): AwsKmsSigner {
    const client = options.client ?? new KMSClient({ region: options.region })
    return new AwsKmsSigner(client, options.keyId)
  }

  /**
   * Fetch and compress the key's public key.
   *
   * @returns The XRPL-format compressed public key hex.
   * @throws {@link SimpleXRPLError} if KMS returns no public key.
   */
  public async publicKey(): Promise<string> {
    const response = await this.client.send(
      new GetPublicKeyCommand({ KeyId: this.keyId }),
    )
    if (response.PublicKey === undefined) {
      throw new SimpleXRPLError('AWS KMS returned no public key')
    }
    return spkiToCompressedHex(response.PublicKey)
  }

  /**
   * Sign a 32-byte digest with the KMS key (`MessageType: DIGEST`), returning
   * the raw scalars. The `ECDSA_SHA_256` label denotes ECDSA over a 32-byte
   * digest — the digest we pass is XRPL's SHA-512Half, which KMS signs as-is.
   *
   * @param digest - The 32-byte digest to sign.
   * @returns The `{ r, s }` scalars (the SDK normalizes and DER-encodes).
   * @throws {@link SimpleXRPLError} if KMS returns no signature.
   */
  public async signDigest(digest: Uint8Array): Promise<EcdsaSignature> {
    const response = await this.client.send(
      new SignCommand({
        KeyId: this.keyId,
        Message: digest,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      }),
    )
    if (response.Signature === undefined) {
      throw new SimpleXRPLError('AWS KMS returned no signature')
    }
    return derToScalars(response.Signature)
  }
}
