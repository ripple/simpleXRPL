import {
  createPublicKey,
  createVerify,
  verify as cryptoVerify,
} from 'node:crypto'

import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'

import { generateTestKey } from './test-utils.js'

describe('KeypairService.detectKeyType', () => {
  it('detects each supported algorithm from its PEM private key', () => {
    expect(KeypairService.detectKeyType(generateTestKey('ed25519'))).toBe(
      'ed25519',
    )
    expect(KeypairService.detectKeyType(generateTestKey('secp256k1'))).toBe(
      'secp256k1',
    )
    expect(KeypairService.detectKeyType(generateTestKey('secp256r1'))).toBe(
      'secp256r1',
    )
  })

  it("returns 'unknown' for non-key garbage", () => {
    expect(KeypairService.detectKeyType('not a key')).toBe('unknown')
  })

  it('fromPrivateKey throws CustodyAuthError on an unrecognized key', () => {
    expect(() => KeypairService.fromPrivateKey('garbage')).toThrow(
      /Unsupported or unrecognized private key/u,
    )
  })
})

describe('KeypairService signing', () => {
  it.each(['secp256k1', 'secp256r1'] as const)(
    '%s: produces a base64 DER signature that verifies',
    (algo) => {
      const pem = generateTestKey(algo)
      const svc = KeypairService.fromPrivateKey(pem)
      const message = 'challenge-nonce-123'

      const sig = Buffer.from(svc.sign(pem, message), 'base64')

      const verifier = createVerify('SHA256')
      verifier.update(message)
      expect(
        verifier.verify({ key: createPublicKey(pem), dsaEncoding: 'der' }, sig),
      ).toBe(true)
    },
  )

  it('ed25519: re-wraps the raw signature as DER and the halves verify', () => {
    const pem = generateTestKey('ed25519')
    const svc = KeypairService.fromPrivateKey(pem)
    // A bare token (not JSON) is signed as-is, without the SHA-256 pre-hash.
    const message = 'challenge-nonce-123'

    const der = Buffer.from(svc.sign(pem, message), 'base64')
    expect(der[0]).toBe(0x30)
    expect(der[1]).toBe(der.length - 2)

    // Reconstruct the raw 64-byte signature (stripping any DER pad bytes)
    // and verify it.
    expect(der[2]).toBe(0x02)
    const rLen = der[3]
    const rStart = 4
    const rBytes = der.subarray(rStart + (rLen === 33 ? 1 : 0), rStart + rLen)
    const sTag = rStart + rLen
    expect(der[sTag]).toBe(0x02)
    const sLen = der[sTag + 1]
    const sStart = sTag + 2
    const sBytes = der.subarray(sStart + (sLen === 33 ? 1 : 0), sStart + sLen)
    const raw = Buffer.concat([rBytes, sBytes])
    expect(raw.length).toBe(64)
    expect(
      cryptoVerify(null, Buffer.from(message), createPublicKey(pem), raw),
    ).toBe(true)
  })

  it('is deterministic for ed25519 (same input => same signature)', () => {
    const pem = generateTestKey('ed25519')
    const svc = KeypairService.fromPrivateKey(pem)
    expect(svc.sign(pem, 'abc')).toBe(svc.sign(pem, 'abc'))
  })
})

describe('KeypairService.derivePublicKeyBase64', () => {
  it('derives a base64 SPKI key matching the private key for every algorithm', () => {
    for (const algo of ['secp256k1', 'secp256r1', 'ed25519'] as const) {
      const pem = generateTestKey(algo)
      const derived = KeypairService.derivePublicKeyBase64(pem)
      const expected = createPublicKey(pem)
        .export({ type: 'spki', format: 'der' })
        .toString('base64')
      expect(derived).toBe(expected)
    }
  })

  it('throws CustodyAuthError on an unparseable key', () => {
    expect(() => KeypairService.derivePublicKeyBase64('nope')).toThrow(
      /Failed to derive public key/u,
    )
  })
})
