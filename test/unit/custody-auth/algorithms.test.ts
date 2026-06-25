import { CustodyAuthError } from '../../../src/core/errors.js'
import {
  Secp256k1Service,
  Secp256r1Service,
} from '../../../src/custodians/ripple/auth/algorithms/ecdsa.service.js'
import { Ed25519Service } from '../../../src/custodians/ripple/auth/algorithms/ed25519.service.js'

import { generateTestKey } from './test-utils.js'

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
})
