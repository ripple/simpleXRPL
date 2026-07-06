import { CustodyAuthError } from '../../../src/core/errors.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'

import { generateTestKey } from './test-utils.js'

function makeSigner(): IntentSigner {
  // ed25519 signing is deterministic, so order-independent canonicalization can
  // be asserted via signature equality. (ECDSA would vary per call.)
  const pem = generateTestKey('ed25519')
  return new IntentSigner(KeypairService.fromPrivateKey(pem), pem)
}

describe('IntentSigner', () => {
  it('signs identically regardless of key order (canonicalization)', () => {
    const signer = makeSigner()
    const first = signer.signRequest({
      amount: '10',
      destination: 'rDest',
      type: 'Payment',
    })
    const second = signer.signRequest({
      type: 'Payment',
      destination: 'rDest',
      amount: '10',
    })
    expect(first).toBe(second)
  })

  it('does not mutate the input request', () => {
    const signer = makeSigner()
    const req = { foo: 1, bar: 2 }
    signer.signRequest(req)
    expect(req).toEqual({ foo: 1, bar: 2 })
  })

  it('signEnvelope populates signature from request', () => {
    const signer = makeSigner()
    const env = signer.signEnvelope({ request: { foo: 'bar' } })
    expect(env.signature).toBeTruthy()
    expect(env.request).toEqual({ foo: 'bar' })
  })

  it('signEnvelope leaves an already-signed envelope untouched', () => {
    const signer = makeSigner()
    const env = { request: { foo: 'bar' }, signature: 'preset' }
    expect(signer.signEnvelope(env).signature).toBe('preset')
  })

  it('throws CustodyAuthError when the body cannot be canonicalized', () => {
    const signer = makeSigner()
    expect(() => signer.signRequest(undefined)).toThrow(CustodyAuthError)
  })

  it('throws when the keypair algorithm does not match the private key', () => {
    const edPem = generateTestKey('ed25519')
    const ecPem = generateTestKey('secp256k1')
    expect(
      () => new IntentSigner(KeypairService.fromPrivateKey(edPem), ecPem),
    ).toThrow(/secp256k1/u)
  })
})
