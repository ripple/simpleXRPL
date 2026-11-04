import { createPublicKey, sign as nodeSign, verify } from 'node:crypto'

import { encodeEd25519Signature } from '../../../src/custodians/ripple/auth/algorithms/ed25519.service.js'
import { generateCustodyKeypair as generateFromModule } from '../../../src/custodians/ripple/auth/generate-keypair.js'
import { LocalKeySigner } from '../../../src/custodians/ripple/auth/key-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import type { CustodyKeyAlgorithm } from '../../../src/custodians/ripple/auth/signer-port.js'
import { generateCustodyKeypair, SimpleXRPLError } from '../../../src/index.js'

const ALGORITHMS: readonly CustodyKeyAlgorithm[] = [
  'ed25519',
  'secp256k1',
  'secp256r1',
]

/**
 * A login challenge — signed as-is by every algorithm, so Node's standard
 * verify checks it directly. (An intent's JSON body is signed by ed25519 as
 * its SHA-256 digest, Custody's scheme; key-signer tests cover that.)
 */
const MESSAGE = '6f2c1d5e-3a4b-4c8d-9e0f-112233445566'

describe('generateCustodyKeypair', () => {
  it('is exported from the package root', () => {
    expect(generateCustodyKeypair).toBe(generateFromModule)
  })

  describe.each(ALGORITHMS)('%s', (algorithm) => {
    it('returns a PKCS#8 PEM private key and a base64 SPKI public key', async () => {
      const keypair = await generateCustodyKeypair(algorithm)

      expect(keypair.algorithm).toBe(algorithm)
      expect(keypair.privateKey).toMatch(
        /^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----\n$/u,
      )
      // Base64 of DER, which parses back as an SPKI public key.
      expect(keypair.publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/u)
      const parsed = createPublicKey({
        key: Buffer.from(keypair.publicKey, 'base64'),
        format: 'der',
        type: 'spki',
      })
      expect(parsed.type).toBe('public')
    })

    it('makes a key the SDK detects as that algorithm, with the matching public key', async () => {
      const keypair = await generateCustodyKeypair(algorithm)

      expect(KeypairService.detectKeyType(keypair.privateKey)).toBe(algorithm)
      expect(KeypairService.derivePublicKeyBase64(keypair.privateKey)).toBe(
        keypair.publicKey,
      )
    })

    it('signs as the SDK’s signer, verifiably against the public key', async () => {
      const keypair = await generateCustodyKeypair(algorithm)
      const signer = LocalKeySigner.fromPrivateKey(keypair.privateKey)

      const signature = await signer.sign(MESSAGE)

      // What Custody checks once the public key is registered for the user.
      const publicKey = createPublicKey({
        key: Buffer.from(keypair.publicKey, 'base64'),
        format: 'der',
        type: 'spki',
      })
      expect(signer.algorithm).toBe(algorithm)
      expect(signer.publicKeyBase64).toBe(keypair.publicKey)
      if (algorithm === 'ed25519') {
        // Deterministic: the SDK's signature is the raw one — which verifies
        // against the public key — in Custody's DER wrapping.
        const raw = nodeSign(null, Buffer.from(MESSAGE), keypair.privateKey)
        expect(verify(null, Buffer.from(MESSAGE), publicKey, raw)).toBe(true)
        expect(signature).toBe(encodeEd25519Signature(raw))
      } else {
        expect(
          verify(
            'sha256',
            Buffer.from(MESSAGE),
            publicKey,
            Buffer.from(signature, 'base64'),
          ),
        ).toBe(true)
      }
    })

    it('makes a new key on every call', async () => {
      const [first, second] = await Promise.all([
        generateCustodyKeypair(algorithm),
        generateCustodyKeypair(algorithm),
      ])

      expect(first.privateKey).not.toBe(second.privateKey)
      expect(first.publicKey).not.toBe(second.publicKey)
    })
  })

  it('rejects an algorithm Custody does not support', async () => {
    const generated = generateCustodyKeypair('rsa' as CustodyKeyAlgorithm)

    await expect(generated).rejects.toThrow(SimpleXRPLError)
    await expect(generated).rejects.toThrow(
      "Unsupported Custody key algorithm 'rsa'; expected one of ed25519, secp256k1, secp256r1",
    )
  })
})
