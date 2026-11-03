import { createPrivateKey, createPublicKey, verify } from 'node:crypto'

import { GetPublicKeyCommand, SignCommand } from '@aws-sdk/client-kms'
import type { KMSClient } from '@aws-sdk/client-kms'
import { p256 } from '@noble/curves/p256'
import { secp256k1 } from '@noble/curves/secp256k1'

import { AwsKmsCustodySigner } from '../../../src/custodians/external/adapters/aws-kms.js'
import { PortKeySigner } from '../../../src/custodians/ripple/auth/key-signer.js'
import { SimpleXRPLError } from '../../../src/errors.js'
import { generateTestKey } from '../custody-auth/test-utils.js'

/** What a fake KMS key looks like. */
interface FakeKey {
  readonly keySpec: string
  readonly pem?: string
  readonly omitPublicKey?: boolean
  readonly omitSignature?: boolean
}

/** A fake KMS client and the commands it received. */
interface FakeKms {
  readonly client: KMSClient
  readonly commands: Array<GetPublicKeyCommand | SignCommand>
}

/**
 * A fake KMS holding one key: answers `GetPublicKey` with the key's SPKI DER
 * and spec, and `Sign` (DIGEST, ECDSA_SHA_256) by signing the digest as-is,
 * returning DER — as KMS does.
 *
 * @param key - The key and any misbehavior to simulate.
 * @returns The fake.
 */
function fakeKms(key: FakeKey): FakeKms {
  const commands: FakeKms['commands'] = []
  const client = {
    async send(command: GetPublicKeyCommand | SignCommand): Promise<unknown> {
      commands.push(command)
      if (command instanceof GetPublicKeyCommand) {
        return {
          KeySpec: key.keySpec,
          PublicKey:
            key.omitPublicKey || key.pem === undefined
              ? undefined
              : Uint8Array.from(
                  createPublicKey(key.pem).export({
                    type: 'spki',
                    format: 'der',
                  }),
                ),
        }
      }
      if (key.omitSignature || key.pem === undefined) {
        return {}
      }
      const { d: scalar } = createPrivateKey(key.pem).export({ format: 'jwk' })
      const curve = key.keySpec === 'ECC_SECG_P256K1' ? secp256k1 : p256
      const digest = command.input.Message ?? new Uint8Array()
      return {
        Signature: curve
          .sign(digest, Buffer.from(scalar ?? '', 'base64url'))
          .toDERRawBytes(),
      }
    },
  } as unknown as KMSClient
  return { client, commands }
}

describe('AwsKmsCustodySigner', () => {
  it.each([
    ['ECC_SECG_P256K1', 'secp256k1'],
    ['ECC_NIST_P256', 'secp256r1'],
  ] as const)(
    'maps a %s key to %s and reads its public key',
    async (keySpec, algorithm) => {
      const pem = generateTestKey(algorithm)
      const kms = fakeKms({ keySpec, pem })

      const signer = await AwsKmsCustodySigner.create({
        keyId: 'alias/custody-api-user',
        client: kms.client,
      })

      expect(signer.algorithm).toBe(algorithm)
      expect(await signer.publicKey()).toBe(
        createPublicKey(pem)
          .export({ type: 'spki', format: 'der' })
          .toString('base64'),
      )
      expect(kms.commands[0]?.input).toEqual({
        KeyId: 'alias/custody-api-user',
      })
    },
  )

  it('signs the digest it is given as a KMS digest, with ECDSA_SHA_256', async () => {
    const kms = fakeKms({
      keySpec: 'ECC_NIST_P256',
      pem: generateTestKey('secp256r1'),
    })
    const signer = await AwsKmsCustodySigner.create({
      keyId: 'key-1',
      client: kms.client,
    })
    const digest = new Uint8Array(32).fill(9)

    await signer.sign(digest)

    expect(kms.commands[1]?.input).toEqual({
      KeyId: 'key-1',
      Message: digest,
      MessageType: 'DIGEST',
      SigningAlgorithm: 'ECDSA_SHA_256',
    })
  })

  it('works end to end as a Custody signer port', async () => {
    const pem = generateTestKey('secp256k1')
    const port = await AwsKmsCustodySigner.create({
      keyId: 'key-1',
      client: fakeKms({ keySpec: 'ECC_SECG_P256K1', pem }).client,
    })
    const signer = await PortKeySigner.create(port)
    const message = '{"request":{"type":"Propose"}}'

    const signature = await signer.sign(message, 'intent')

    expect(
      verify(
        'sha256',
        Buffer.from(message),
        createPublicKey(pem),
        Buffer.from(signature, 'base64'),
      ),
    ).toBe(true)
  })

  it.each(['ECC_NIST_EDWARDS25519', 'RSA_2048', 'ECC_NIST_P384'])(
    'rejects a %s key, naming the key specs Custody can use',
    async (keySpec) => {
      const kms = fakeKms({ keySpec, pem: generateTestKey('secp256r1') })

      await expect(
        AwsKmsCustodySigner.create({ keyId: 'key-1', client: kms.client }),
      ).rejects.toThrow(
        `AWS KMS key key-1 is ${keySpec}; a Ripple Custody API key in KMS must be ` +
          'ECC_SECG_P256K1 (secp256k1) or ECC_NIST_P256 (secp256r1).',
      )
    },
  )

  it('rejects a key KMS returns no public key for', async () => {
    const kms = fakeKms({ keySpec: 'ECC_NIST_P256', omitPublicKey: true })

    await expect(
      AwsKmsCustodySigner.create({ keyId: 'key-1', client: kms.client }),
    ).rejects.toThrow(SimpleXRPLError)
  })

  it('rejects a sign response with no signature', async () => {
    const kms = fakeKms({
      keySpec: 'ECC_NIST_P256',
      pem: generateTestKey('secp256r1'),
      omitSignature: true,
    })
    const signer = await AwsKmsCustodySigner.create({
      keyId: 'key-1',
      client: kms.client,
    })

    await expect(signer.sign(new Uint8Array(32))).rejects.toThrow(
      'AWS KMS returned no signature',
    )
  })
})
