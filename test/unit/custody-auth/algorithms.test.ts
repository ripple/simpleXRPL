import { generateKeyPairSync, sign as nodeSign } from 'node:crypto'

import { CustodyAuthError } from '../../../src/core/errors.js'
import {
  Secp256k1Service,
  Secp256r1Service,
} from '../../../src/custodians/ripple/auth/algorithms/ecdsa.service.js'
import { Ed25519Service } from '../../../src/custodians/ripple/auth/algorithms/ed25519.service.js'

import { generateTestKey } from './test-utils.js'

const HIGH_BIT_TEST_ITERATIONS = 100

/**
 * Decode a DER `30 len 02 rLen <r> 02 sLen <s>` signature back to the raw
 * 64-byte (r || s) signature, enforcing DER's leading-zero pad-byte rule.
 *
 * @param derBase64 - The base64-encoded DER signature.
 * @returns The raw 64-byte signature.
 * @throws {Error} if the input is not validly DER-encoded per that rule.
 */
function decodeDerToRaw(derBase64: string): Buffer {
  const der = Buffer.from(derBase64, 'base64')
  if (der[0] !== 0x30) {
    throw new Error('not a DER SEQUENCE')
  }
  let offset = 2
  const readInt = (): Buffer => {
    if (der[offset] !== 0x02) {
      throw new Error('expected INTEGER tag')
    }
    const len = der[offset + 1]
    const start = offset + 2
    const bytes = der.subarray(start, start + len)
    offset = start + len
    // Each half is exactly 32 raw bytes, optionally prefixed with one 0x00
    // pad byte when the raw high bit is set — any other length is malformed.
    if (len === 33) {
      if (bytes[0] !== 0x00 || bytes[1] < 0x80) {
        throw new Error('33-byte INTEGER missing a correct 0x00 pad byte')
      }
      return Buffer.from(bytes.subarray(1))
    }
    if (len === 32) {
      if (bytes[0] >= 0x80) {
        throw new Error('high-bit INTEGER missing required 0x00 pad')
      }
      return Buffer.from(bytes)
    }
    throw new Error(`unexpected INTEGER length ${len}`)
  }
  const rInt = readInt()
  const sInt = readInt()
  const pad32 = (buf: Buffer): Buffer =>
    Buffer.concat([Buffer.alloc(32 - buf.length), buf])
  return Buffer.concat([pad32(rInt), pad32(sInt)])
}

describe('ECDSA signer validation (secp256k1 / secp256r1)', () => {
  const cases = [
    {
      name: 'secp256k1',
      svc: new Secp256k1Service(),
      good: generateTestKey('secp256k1'),
    },
    {
      name: 'secp256r1',
      svc: new Secp256r1Service(),
      good: generateTestKey('secp256r1'),
    },
  ] as const

  it.each(cases)('$name rejects a non-string message', ({ svc, good }) => {
    expect(() => svc.sign(good, 123 as unknown as string)).toThrow(
      CustodyAuthError,
    )
  })

  it.each(cases)('$name rejects a key missing PEM markers', ({ svc }) => {
    expect(() => svc.sign('no markers here', 'msg')).toThrow(/PEM-encoded/u)
  })

  it.each(cases)(
    '$name rejects a structurally-PEM unparseable key',
    ({ svc }) => {
      const bogus =
        '-----BEGIN EC PRIVATE KEY-----\nnotbase64!!!\n-----END EC PRIVATE KEY-----'
      expect(() => svc.sign(bogus, 'msg')).toThrow(CustodyAuthError)
    },
  )

  it('secp256k1 rejects a secp256r1 key (wrong curve)', () => {
    expect(() =>
      new Secp256k1Service().sign(generateTestKey('secp256r1'), 'msg'),
    ).toThrow(/secp256k1/u)
  })

  it('secp256r1 rejects a secp256k1 key (wrong curve)', () => {
    expect(() =>
      new Secp256r1Service().sign(generateTestKey('secp256k1'), 'msg'),
    ).toThrow(/secp256r1/u)
  })

  it.each(cases)(
    '$name accepts a PKCS#8-encoded key (not just SEC1)',
    ({ svc, name }) => {
      const namedCurve = name === 'secp256k1' ? 'secp256k1' : 'prime256v1'
      const { privateKey } = generateKeyPairSync('ec', {
        namedCurve,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'der' },
      })
      expect(() => svc.sign(privateKey, 'msg')).not.toThrow()
    },
  )
})

describe('Ed25519 signer', () => {
  const svc = new Ed25519Service()
  const key = generateTestKey('ed25519')

  it('rejects a non-string message', () => {
    expect(() => svc.sign(key, 123 as unknown as string)).toThrow(
      CustodyAuthError,
    )
  })

  it('rejects a non-PKCS#8 key', () => {
    expect(() => svc.sign(generateTestKey('secp256k1'), 'msg')).toThrow(
      /PEM-encoded/u,
    )
  })

  it('SHA-256-hashes JSON object messages before signing', () => {
    // A serialized object and a near-identical bare token must differ, because
    // the object path hashes first while the token path signs the bytes.
    // The trailing space on the token form makes it fail the object check.
    const asObject = svc.sign(key, JSON.stringify({ num: 1 }))
    const asToken = svc.sign(key, '{"num":1} ')
    expect(asObject).not.toBe(asToken)
  })

  it('DER-wraps signatures whose r or s has a high first byte without corruption', () => {
    for (
      let iteration = 0;
      iteration < HIGH_BIT_TEST_ITERATIONS;
      iteration += 1
    ) {
      const message = `msg-${iteration}`
      const decoded = decodeDerToRaw(svc.sign(key, message))
      const raw = nodeSign(null, Buffer.from(message), key)
      expect(decoded.equals(raw)).toBe(true)
    }
  })
})
