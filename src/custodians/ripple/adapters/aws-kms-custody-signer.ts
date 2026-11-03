import {
  GetPublicKeyCommand,
  KMSClient,
  SignCommand,
} from '@aws-sdk/client-kms'

import { SimpleXRPLError } from '../../../errors.js'
import type {
  CustodyKeyAlgorithm,
  CustodySignerPort,
} from '../auth/signer-port.js'

/**
 * The Custody API key algorithm an AWS KMS key spec corresponds to.
 *
 * @param keySpec - The KMS key spec.
 * @returns The algorithm, or `undefined` if Custody can't use the key.
 */
function algorithmForKeySpec(
  keySpec: string | undefined,
): CustodyKeyAlgorithm | undefined {
  if (keySpec === 'ECC_SECG_P256K1') {
    return 'secp256k1'
  }
  if (keySpec === 'ECC_NIST_P256') {
    return 'secp256r1'
  }
  return undefined
}

/** A KMS key resolved by {@link AwsKmsCustodySigner.create}. */
interface ResolvedKey {
  readonly keyId: string
  readonly algorithm: CustodyKeyAlgorithm
  readonly publicKeyBase64: string
}

/** Options for {@link AwsKmsCustodySigner.create}. */
export interface AwsKmsCustodySignerOptions {
  /**
   * The KMS key id or ARN of the Custody API user's key. Must be an
   * `ECC_SECG_P256K1` (secp256k1) or `ECC_NIST_P256` (secp256r1) signing key.
   */
  readonly keyId: string
  /** A pre-built KMS client. Provide one, or `region` to construct the default. */
  readonly client?: KMSClient
  /** AWS region, used when `client` is omitted. */
  readonly region?: string
}

/**
 * A {@link CustodySignerPort} backed by AWS KMS: the Ripple Custody API user's
 * private key stays in KMS and never enters the process. Pass it as
 * `auth.signer` to `RippleCustody.create` (or `signer` to `fromEnv`). Requires
 * the optional peer dependency `@aws-sdk/client-kms`.
 *
 * Signs with `ECDSA_SHA_256` over a digest (`MessageType: DIGEST`), so request
 * size never runs into KMS's 4 KB limit on raw messages.
 */
export class AwsKmsCustodySigner implements CustodySignerPort {
  public readonly algorithm: CustodyKeyAlgorithm
  private readonly client: KMSClient
  private readonly keyId: string
  private readonly publicKeyBase64: string

  /**
   * Construct from a resolved key.
   *
   * @param client - The KMS client.
   * @param key - The key id, algorithm and public key read from KMS.
   */
  private constructor(client: KMSClient, key: ResolvedKey) {
    this.client = client
    this.keyId = key.keyId
    this.algorithm = key.algorithm
    this.publicKeyBase64 = key.publicKeyBase64
  }

  /**
   * Build the signer, reading the key's type and public key from KMS.
   *
   * @param options - The key id and either a client or a region.
   * @returns The signer port.
   * @throws {@link SimpleXRPLError} if KMS returns no public key, or the key
   *   isn't a secp256k1 or secp256r1 key.
   */
  public static async create(
    options: AwsKmsCustodySignerOptions,
  ): Promise<AwsKmsCustodySigner> {
    const client = options.client ?? new KMSClient({ region: options.region })
    const response = await client.send(
      new GetPublicKeyCommand({ KeyId: options.keyId }),
    )
    if (response.PublicKey === undefined) {
      throw new SimpleXRPLError('AWS KMS returned no public key')
    }
    const algorithm = algorithmForKeySpec(response.KeySpec)
    if (algorithm === undefined) {
      throw new SimpleXRPLError(
        `AWS KMS key ${options.keyId} is ${response.KeySpec ?? 'of an unknown spec'}; ` +
          'a Ripple Custody API key in KMS must be ECC_SECG_P256K1 (secp256k1) ' +
          'or ECC_NIST_P256 (secp256r1).',
      )
    }
    return new AwsKmsCustodySigner(client, {
      keyId: options.keyId,
      algorithm,
      publicKeyBase64: Buffer.from(response.PublicKey).toString('base64'),
    })
  }

  /**
   * The key's public key, as read from KMS.
   *
   * @returns The base64 SPKI DER public key.
   */
  public async publicKey(): Promise<string> {
    return this.publicKeyBase64
  }

  /**
   * Sign a 32-byte SHA-256 digest with the KMS key.
   *
   * @param data - The digest the SDK prepared.
   * @returns The DER-encoded ECDSA signature.
   * @throws {@link SimpleXRPLError} if KMS returns no signature.
   */
  public async sign(data: Uint8Array): Promise<Uint8Array> {
    const response = await this.client.send(
      new SignCommand({
        KeyId: this.keyId,
        Message: data,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      }),
    )
    if (response.Signature === undefined) {
      throw new SimpleXRPLError('AWS KMS returned no signature')
    }
    return response.Signature
  }
}
