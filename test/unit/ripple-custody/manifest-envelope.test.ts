import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import { buildSignManifestIntentBody } from '../../../src/custodians/ripple/mapping/manifest-envelope.js'
import type { components } from '../../../src/generated/custody.js'
import { generateTestKey } from '../custody-auth/test-utils.js'

function makeSigner(): IntentSigner {
  const pem = generateTestKey('ed25519')
  return new IntentSigner(KeypairService.fromPrivateKey(pem), pem)
}

type ProposeIntentBody = ReturnType<typeof buildSignManifestIntentBody>

/**
 * Narrow the payload to the `v0_SignManifest` variant this envelope always builds.
 *
 * @param body - The built envelope.
 * @returns The narrowed payload.
 * @throws {@link Error} if the payload is some other variant (would indicate
 * a bug in {@link buildSignManifestIntentBody}).
 */
function manifestPayload(
  body: ProposeIntentBody,
): components['schemas']['Core_v0_SignManifest'] {
  const { payload } = body.request
  if (payload.type !== 'v0_SignManifest') {
    throw new Error(`expected v0_SignManifest, got ${payload.type}`)
  }
  return payload
}

describe('buildSignManifestIntentBody', () => {
  it('builds a signed v0_SignManifest envelope carrying the Unsafe preimage', () => {
    const body = buildSignManifestIntentBody(
      makeSigner(),
      { note: 'raw payment' },
      {
        domainId: 'domain-1',
        authorUserId: 'user-1',
        accountId: 'account-1',
        preimageBase64: 'cHJlaW1hZ2U=',
      },
    )

    expect(body.signature).toBeTruthy()
    expect(body.request.author).toEqual({ id: 'user-1', domainId: 'domain-1' })
    expect(body.request.targetDomainId).toBe('domain-1')
    expect(body.request.type).toBe('Propose')
    expect(body.request.customProperties).toEqual({ note: 'raw payment' })

    const payload = manifestPayload(body)
    expect(payload.accountId).toBe('account-1')
    expect(payload.content).toEqual({ value: 'cHJlaW1hZ2U=', type: 'Unsafe' })
    expect(payload.customProperties).toEqual({ note: 'raw payment' })
  })

  it('uses the given idempotencyKey as both the request id and the payload id', () => {
    const body = buildSignManifestIntentBody(
      makeSigner(),
      {},
      {
        domainId: 'domain-1',
        authorUserId: 'user-1',
        accountId: 'account-1',
        preimageBase64: 'cHJlaW1hZ2U=',
        idempotencyKey: 'retry-key-1',
      },
    )

    expect(body.request.id).toBe('retry-key-1')
    expect(manifestPayload(body).id).toBe('retry-key-1')
  })

  it('generates a fresh id when no idempotencyKey is given, and keeps request/payload ids in sync', () => {
    const body = buildSignManifestIntentBody(
      makeSigner(),
      {},
      {
        domainId: 'domain-1',
        authorUserId: 'user-1',
        accountId: 'account-1',
        preimageBase64: 'cHJlaW1hZ2U=',
      },
    )

    expect(body.request.id).toBeTruthy()
    expect(body.request.id).toBe(manifestPayload(body).id)
  })
})
