import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as nodeSign,
  verify,
} from 'node:crypto'

import { p256 } from '@noble/curves/p256'
import { secp256k1 } from '@noble/curves/secp256k1'

import {
  LocalKeySigner,
  PortKeySigner,
  resolveKeySigner,
} from '../../../src/custodians/ripple/auth/key-signer.js'
import type {
  CustodyKeyAlgorithm,
  CustodySignContext,
  CustodySignerPort,
} from '../../../src/custodians/ripple/auth/signer-port.js'
import { CustodyAuthError, SimpleXRPLError } from '../../../src/errors.js'

import { generateTestKey } from './test-utils.js'

/** A canonicalized intent request, as the SDK signs it. */
const INTENT = '{"request":{"amount":"10","type":"Payment"}}'

/** A login challenge, as the SDK signs it. */
const CHALLENGE = '6f2c1d5e-3a4b-4c8d-9e0f-112233445566'

/**
 * The key's public half as a PEM `PUBLIC KEY` block.
 *
 * @param pem - The private key.
 * @returns The public key PEM.
 */
function publicPem(pem: string): string {
  return createPublicKey(pem).export({ type: 'spki', format: 'pem' }).toString()
}

/**
 * Sign a digest the way an HSM's raw ECDSA primitive does — without hashing
 * it again — returning DER. (Node's `crypto.sign` always hashes first, so it
 * can't stand in for an HSM here.)
 *
 * @param pem - The EC private key.
 * @param algorithm - Its curve.
 * @param digest - The 32-byte digest.
 * @returns The DER signature.
 */
function signDigest(
  pem: string,
  algorithm: 'secp256k1' | 'secp256r1',
  digest: Uint8Array,
): Uint8Array {
  const { d: scalar } = createPrivateKey(pem).export({ format: 'jwk' })
  const privateKey = Buffer.from(scalar ?? '', 'base64url')
  const curve = algorithm === 'secp256k1' ? secp256k1 : p256
  return curve.sign(digest, privateKey).toDERRawBytes()
}

/** A port backed by a local key, recording what it was asked to sign. */
interface RecordingPort extends CustodySignerPort {
  readonly calls: Array<{ data: Buffer; context: CustodySignContext }>
}

/**
 * Build an HSM-like port over a local key.
 *
 * @param algorithm - The key algorithm.
 * @param pem - The private key.
 * @returns The recording port.
 */
function hsmPort(algorithm: CustodyKeyAlgorithm, pem: string): RecordingPort {
  const calls: RecordingPort['calls'] = []
  return {
    algorithm,
    calls,
    publicKey: async () => publicPem(pem),
    async sign(data, context): Promise<Uint8Array> {
      calls.push({ data: Buffer.from(data), context })
      return algorithm === 'ed25519'
        ? nodeSign(null, data, pem)
        : signDigest(pem, algorithm, data)
    },
  }
}

const sha256 = (text: string): Buffer =>
  createHash('sha256').update(text).digest()

describe('PortKeySigner', () => {
  it('produces exactly what the in-process signer does, for ed25519', async () => {
    const pem = generateTestKey('ed25519')
    const local = LocalKeySigner.fromPrivateKey(pem)
    const viaPort = await PortKeySigner.create(hsmPort('ed25519', pem))

    expect(viaPort.publicKeyBase64).toBe(local.publicKeyBase64)
    expect(await viaPort.sign(CHALLENGE, 'auth-challenge')).toBe(
      await local.sign(CHALLENGE),
    )
    expect(await viaPort.sign(INTENT, 'intent')).toBe(await local.sign(INTENT))
  })

  it('hands an ed25519 port the raw challenge, and an intent’s SHA-256 digest', async () => {
    const port = hsmPort('ed25519', generateTestKey('ed25519'))
    const signer = await PortKeySigner.create(port)

    await signer.sign(CHALLENGE, 'auth-challenge')
    await signer.sign(INTENT, 'intent')

    expect(port.calls).toEqual([
      { data: Buffer.from(CHALLENGE), context: 'auth-challenge' },
      { data: sha256(INTENT), context: 'intent' },
    ])
  })

  it.each(['secp256k1', 'secp256r1'] as const)(
    'hands a %s port the SHA-256 digest of both, and returns its DER signature',
    async (algorithm) => {
      const pem = generateTestKey(algorithm)
      const port = hsmPort(algorithm, pem)
      const signer = await PortKeySigner.create(port)

      const challengeSignature = await signer.sign(CHALLENGE, 'auth-challenge')
      const intentSignature = await signer.sign(INTENT, 'intent')

      expect(port.calls).toEqual([
        { data: sha256(CHALLENGE), context: 'auth-challenge' },
        { data: sha256(INTENT), context: 'intent' },
      ])
      // What Custody verifies: ECDSA-SHA256 over the message, base64 DER — the
      // same check the in-process key's signatures pass.
      const publicKey = createPublicKey(pem)
      expect(
        verify(
          'sha256',
          Buffer.from(CHALLENGE),
          publicKey,
          Buffer.from(challengeSignature, 'base64'),
        ),
      ).toBe(true)
      expect(
        verify(
          'sha256',
          Buffer.from(INTENT),
          publicKey,
          Buffer.from(intentSignature, 'base64'),
        ),
      ).toBe(true)
      expect(signer.publicKeyBase64).toBe(
        LocalKeySigner.fromPrivateKey(pem).publicKeyBase64,
      )
    },
  )

  it('accepts the public key as base64 SPKI DER as well as PEM', async () => {
    const pem = generateTestKey('secp256r1')
    const der = createPublicKey(pem)
      .export({ type: 'spki', format: 'der' })
      .toString('base64')

    const signer = await PortKeySigner.create({
      ...hsmPort('secp256r1', pem),
      publicKey: async () => der,
    })

    expect(signer.publicKeyBase64).toBe(der)
  })

  describe('rejects a misconfigured port', () => {
    it('whose public key is for another algorithm', async () => {
      const port = hsmPort('secp256k1', generateTestKey('secp256r1'))

      await expect(PortKeySigner.create(port)).rejects.toThrow(
        'The Custody signer declares secp256k1, but its public key is secp256r1.',
      )
    })

    it('whose public key does not parse', async () => {
      await expect(
        PortKeySigner.create({
          ...hsmPort('ed25519', generateTestKey('ed25519')),
          publicKey: async () => 'not a key',
        }),
      ).rejects.toThrow(/Could not parse the Custody signer's public key/u)
    })

    it('that fails to return its public key', async () => {
      const cause = new Error('AccessDeniedException')
      const created = PortKeySigner.create({
        ...hsmPort('ed25519', generateTestKey('ed25519')),
        async publicKey() {
          throw cause
        },
      })

      await expect(created).rejects.toThrow(CustodyAuthError)
      await expect(created).rejects.toMatchObject({ cause })
    })
  })

  describe('rejects a bad signature before it is sent', () => {
    it('when the port throws', async () => {
      const signer = await PortKeySigner.create({
        ...hsmPort('ed25519', generateTestKey('ed25519')),
        async sign() {
          throw new Error('HSM offline')
        },
      })

      await expect(signer.sign(INTENT, 'intent')).rejects.toThrow(
        'The Custody signer failed to sign the intent',
      )
    })

    it('when an ed25519 signature is not 64 raw bytes', async () => {
      const signer = await PortKeySigner.create({
        ...hsmPort('ed25519', generateTestKey('ed25519')),
        sign: async () => new Uint8Array(63),
      })

      await expect(signer.sign(CHALLENGE, 'auth-challenge')).rejects.toThrow(
        /63-byte ed25519 signature; expected the raw 64 bytes/u,
      )
    })

    it('when an ECDSA signature is raw r‖s instead of DER', async () => {
      const pem = generateTestKey('secp256k1')
      const signer = await PortKeySigner.create({
        ...hsmPort('secp256k1', pem),
        sign: async (data) =>
          secp256k1
            .sign(
              data,
              Buffer.from(
                createPrivateKey(pem).export({ format: 'jwk' }).d ?? '',
                'base64url',
              ),
            )
            .toCompactRawBytes(),
      })

      await expect(signer.sign(INTENT, 'intent')).rejects.toThrow(
        /secp256k1 signature that is not DER-encoded/u,
      )
    })

    it('when the signature is from another key', async () => {
      const signer = await PortKeySigner.create({
        ...hsmPort('ed25519', generateTestKey('ed25519')),
        sign: async (data) => nodeSign(null, data, generateTestKey('ed25519')),
      })

      await expect(signer.sign(INTENT, 'intent')).rejects.toThrow(
        /intent signature does not verify against its public key/u,
      )
    })

    it('when an ECDSA port hashes the digest again, saying so', async () => {
      const pem = generateTestKey('secp256r1')
      const signer = await PortKeySigner.create({
        ...hsmPort('secp256r1', pem),
        // Signs SHA-256(data) rather than data: the classic digest mistake.
        sign: async (data) => nodeSign('sha256', data, pem),
      })

      await expect(signer.sign(CHALLENGE, 'auth-challenge')).rejects.toThrow(
        /treating `data` as a SHA-256 digest \(not hashing it again\)/u,
      )
    })
  })
})

describe('resolveKeySigner', () => {
  it('uses a PEM signingKey in process', async () => {
    const signer = await resolveKeySigner({
      signingKey: generateTestKey('ed25519'),
    })

    expect(signer).toBeInstanceOf(LocalKeySigner)
  })

  it('uses an HSM/KMS signer through its port', async () => {
    const signer = await resolveKeySigner({
      signer: hsmPort('secp256k1', generateTestKey('secp256k1')),
    })

    expect(signer).toBeInstanceOf(PortKeySigner)
  })

  it('rejects both, and neither', async () => {
    const pem = generateTestKey('ed25519')

    await expect(
      resolveKeySigner({ signingKey: pem, signer: hsmPort('ed25519', pem) }),
    ).rejects.toThrow(SimpleXRPLError)
    await expect(resolveKeySigner({})).rejects.toThrow(
      /needs the API user key/u,
    )
  })
})
