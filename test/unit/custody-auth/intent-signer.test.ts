import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import type { CustodyKeySigner } from '../../../src/custodians/ripple/auth/key-signer.js'
import { CustodyAuthError } from '../../../src/errors.js'

import { generateTestKey } from './test-utils.js'

function makeSigner(): IntentSigner {
  // ed25519 signing is deterministic, so order-independent canonicalization can
  // be asserted via signature equality. (ECDSA would vary per call.)
  return IntentSigner.fromPrivateKey(generateTestKey('ed25519'))
}

describe('IntentSigner', () => {
  it('signs identically regardless of key order (canonicalization)', async () => {
    const signer = makeSigner()
    const first = await signer.signRequest({
      amount: '10',
      destination: 'rDest',
      type: 'Payment',
    })
    const second = await signer.signRequest({
      type: 'Payment',
      destination: 'rDest',
      amount: '10',
    })
    expect(first).toBe(second)
  })

  it('does not mutate the input request', async () => {
    const signer = makeSigner()
    const req = { foo: 1, bar: 2 }
    await signer.signRequest(req)
    expect(req).toEqual({ foo: 1, bar: 2 })
  })

  it('signEnvelope populates signature from request', async () => {
    const signer = makeSigner()
    const env = await signer.signEnvelope({ request: { foo: 'bar' } })
    expect(env.signature).toBeTruthy()
    expect(env.request).toEqual({ foo: 'bar' })
  })

  it('signEnvelope leaves an already-signed envelope untouched', async () => {
    const signer = makeSigner()
    const env = { request: { foo: 'bar' }, signature: 'preset' }
    expect((await signer.signEnvelope(env)).signature).toBe('preset')
  })

  it('throws CustodyAuthError when the body cannot be canonicalized', async () => {
    const signer = makeSigner()
    await expect(signer.signRequest(undefined)).rejects.toThrow(
      CustodyAuthError,
    )
  })

  it('signs the canonicalized request through its key signer, as an intent', async () => {
    const keySigner: CustodyKeySigner = {
      algorithm: 'ed25519',
      publicKeyBase64: 'unused',
      sign: jest.fn(async () => 'SIGNED'),
    }

    const signature = await new IntentSigner(keySigner).signRequest({
      zeta: 2,
      alpha: 1,
    })

    expect(signature).toBe('SIGNED')
    expect(keySigner.sign).toHaveBeenCalledWith(
      '{"alpha":1,"zeta":2}',
      'intent',
    )
  })
})
