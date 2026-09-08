import type { Payment } from 'xrpl'

import { CustodyApi } from '../../../src/custodians/ripple/api.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import { buildProposeIntentBody } from '../../../src/custodians/ripple/mapping/envelope.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type { components } from '../../../src/generated/custody.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'
import { FakeHttpPort, ok } from '../custody-discovery/test-utils.js'

const KEY = generateTestKey('ed25519')
const GATEWAY = 'https://custody.example.com'
const DOMAIN = 'domain-1'
const AUTHOR = 'user-1'

/**
 * Build a `CustodyApi` over a real `CustodyHttpClient` whose transport is faked.
 * The auth port is separate from the HTTP port, so `http.requests` holds only
 * the API calls the route map drives — no token-exchange noise. A real
 * `IntentSigner` backs `propose`, so its envelopes are genuinely signed.
 *
 * @param responseBody - The JSON body every recorded request returns.
 * @returns The api under test and the recording HTTP port.
 */
function apiOn(responseBody: unknown = {}): {
  api: CustodyApi
  http: FakeHttpPort
} {
  const http = new FakeHttpPort(() => ok(responseBody))
  const auth = new CustodyAuthService({
    authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
    privateKey: KEY,
  })
  const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })
  const intentSigner = new IntentSigner(KeypairService.fromPrivateKey(KEY), KEY)
  const api = new CustodyApi(client, {
    intentSigner,
    domainId: DOMAIN,
    authorUserId: AUTHOR,
  })
  return { api, http }
}

/** A minimal release-quarantine payload, a payload with no id of its own. */
const RELEASE_PAYLOAD: components['schemas']['Core_v0_ReleaseQuarantinedTransfers'] =
  {
    accountId: 'account-1',
    transferIds: ['transfer-1', 'transfer-2'],
    type: 'v0_ReleaseQuarantinedTransfers',
  }

/**
 * Parse the `Core_ProposeIntentBody` a recorded POST carried.
 *
 * @param http - The recording HTTP port.
 * @returns The parsed envelope body.
 */
function proposedBody(
  http: FakeHttpPort,
): components['schemas']['Core_ProposeIntentBody'] {
  return JSON.parse(
    http.requests[0]?.body ?? '{}',
  ) as components['schemas']['Core_ProposeIntentBody']
}

describe('CustodyApi.call', () => {
  it('resolves a GET route and interpolates multiple path params', async () => {
    const { api, http } = apiOn({ id: 'i1' })

    await api.call('getIntent', { path: { domainId: 'D', intentId: 'I' } })

    expect(http.requests).toHaveLength(1)
    expect(http.requests[0]?.method).toBe('GET')
    expect(http.requests[0]?.url).toBe(`${GATEWAY}/v1/domains/D/intents/I`)
  })

  it('appends query params on a GET', async () => {
    const { api, http } = apiOn({ items: [] })

    await api.call('getAllDomainsAddresses', { query: { address: 'rAddr' } })

    expect(http.requests[0]?.url).toBe(`${GATEWAY}/v1/addresses?address=rAddr`)
  })

  it('serializes an array query param as repeated keys', async () => {
    const { api, http } = apiOn({ items: [], count: 0 })

    // `lock` is an array query param (Core_LockStatus[]); it must not be dropped.
    await api.call('getAccounts', {
      path: { domainId: 'D' },
      query: { lock: ['Locked', 'Archived'] },
    })

    expect(http.requests[0]?.url).toBe(
      `${GATEWAY}/v1/domains/D/accounts?lock=Locked&lock=Archived`,
    )
  })

  it('routes a POST with a JSON body', async () => {
    const { api, http } = apiOn({ id: 'r1' })

    const body = {
      request: {
        author: { id: 'u1', domainId: 'd1' },
        targetDomainId: 'd1',
        intentId: 'i1',
        proposalSignature: 'sig',
        type: 'Approve' as const,
      },
      signature: 'sig',
    }
    await api.call('approveIntent', { body })

    expect(http.requests[0]?.method).toBe('POST')
    expect(http.requests[0]?.url).toBe(`${GATEWAY}/v1/intents/approve`)
    expect(JSON.parse(http.requests[0]?.body ?? '{}')).toEqual(body)
  })

  it('throws when a required path parameter is missing', async () => {
    const { api } = apiOn()

    await expect(
      // @ts-expect-error -- incomplete path, to exercise the runtime guard
      api.call('getIntent', { path: { domainId: 'D' } }),
    ).rejects.toThrow(/Missing path parameter 'intentId'/u)
  })
})

describe('CustodyApi.propose', () => {
  it('POSTs a signed envelope for the payload to /v1/intents', async () => {
    const { api, http } = apiOn({ requestId: 'r1' })

    await api.propose(RELEASE_PAYLOAD)

    expect(http.requests).toHaveLength(1)
    expect(http.requests[0]?.method).toBe('POST')
    expect(http.requests[0]?.url).toBe(`${GATEWAY}/v1/intents`)
    const body = proposedBody(http)
    expect(body.signature).toBeTruthy()
    expect(body.request.payload).toEqual(RELEASE_PAYLOAD)
  })

  it('fills the envelope from the domain/author context by default', async () => {
    const { api, http } = apiOn()

    await api.propose(RELEASE_PAYLOAD)

    const { request } = proposedBody(http)
    expect(request.author).toEqual({ id: AUTHOR, domainId: DOMAIN })
    expect(request.targetDomainId).toBe(DOMAIN)
    expect(request.type).toBe('Propose')
    expect(request.id).toBeTruthy()
    expect(request.customProperties).toEqual({})
    expect(new Date(request.expiryAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('applies per-call overrides', async () => {
    const { api, http } = apiOn()
    const expiryAt = new Date(Date.now() + 60_000).toISOString()

    await api.propose(RELEASE_PAYLOAD, {
      id: 'idem-1',
      expiryAt,
      targetDomainId: 'domain-2',
      author: { id: 'user-2', domainId: 'domain-2' },
      description: 'release two transfers',
      customProperties: { note: 'ops' },
    })

    const { request } = proposedBody(http)
    expect(request.id).toBe('idem-1')
    expect(request.expiryAt).toBe(expiryAt)
    expect(request.targetDomainId).toBe('domain-2')
    expect(request.author).toEqual({ id: 'user-2', domainId: 'domain-2' })
    expect(request.description).toBe('release two transfers')
    expect(request.customProperties).toEqual({ note: 'ops' })
  })

  it('omits description when none is given', async () => {
    const { api, http } = apiOn()

    await api.propose(RELEASE_PAYLOAD)

    expect(proposedBody(http).request).not.toHaveProperty('description')
  })

  it('defaults the envelope id to a payload that carries its own id', async () => {
    const { api, http } = apiOn()
    const signer = new IntentSigner(KeypairService.fromPrivateKey(KEY), KEY)
    const payment: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1',
    }
    // v0_CreateTransactionOrder carries its own id; Custody expects the envelope
    // id to match it, so a caller who doesn't override id must still get them
    // in sync rather than a fresh random envelope id.
    const order = buildProposeIntentBody(signer, {
      domainId: DOMAIN,
      authorUserId: AUTHOR,
      accountId: 'account-1',
      transaction: payment,
      idempotencyKey: 'order-id-1',
    }).request.payload

    await api.propose(order)

    expect(proposedBody(http).request.id).toBe('order-id-1')
  })

  it('returns the Custody intent acknowledgement', async () => {
    const { api } = apiOn({ requestId: 'req-42' })

    const response = await api.propose(RELEASE_PAYLOAD)

    expect(response.requestId).toBe('req-42')
  })
})
