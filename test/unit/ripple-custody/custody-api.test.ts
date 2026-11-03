import type { Payment } from 'xrpl'

import { CustodyApi } from '../../../src/custodians/ripple/api.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { buildProposeIntentBody } from '../../../src/custodians/ripple/mapping/envelope.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import { pinnedCapabilities } from '../../../src/custodians/ripple/versioning/capabilities.js'
import { VersionGuard } from '../../../src/custodians/ripple/versioning/version-guard.js'
import {
  SimpleXRPLError,
  UnsupportedInVersionError,
} from '../../../src/errors.js'
import type { components } from '../../../src/generated/custody.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'
import { FakeHttpPort, ok } from '../custody-discovery/test-utils.js'

import { intentBody } from './test-utils.js'

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
 * @param respond - The JSON body every recorded request returns, or a handler
 *   choosing the response per request.
 * @param versionGuard - The version guard; omitted, nothing is blocked.
 * @returns The api under test and the recording HTTP port.
 */
function apiOn(
  respond: unknown = {},
  versionGuard?: VersionGuard,
): {
  api: CustodyApi
  http: FakeHttpPort
} {
  const http = new FakeHttpPort(
    typeof respond === 'function'
      ? (respond as (request: HttpRequest) => HttpResponse)
      : (): HttpResponse => ok(respond),
  )
  const auth = new CustodyAuthService({
    authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
    privateKey: KEY,
  })
  const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })
  const intentSigner = IntentSigner.fromPrivateKey(KEY)
  const api = new CustodyApi(client, {
    intentSigner,
    domainId: DOMAIN,
    authorUserId: AUTHOR,
    versionGuard,
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
 * Parse the `Core_UserSigned` a recorded POST carried.
 *
 * @param http - The recording HTTP port.
 * @returns The parsed envelope body.
 */
function proposedBody(
  http: FakeHttpPort,
): components['schemas']['Core_UserSigned'] {
  return JSON.parse(
    http.requests[0]?.body ?? '{}',
  ) as components['schemas']['Core_UserSigned']
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

  it('throws when a required path parameter is null (not a "null" segment)', async () => {
    const { api } = apiOn()

    await expect(
      // @ts-expect-error -- null path param, to exercise the runtime guard
      api.call('getIntent', { path: { domainId: 'D', intentId: null } }),
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
    const signer = IntentSigner.fromPrivateKey(KEY)
    const payment: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1',
    }
    // v0_CreateTransactionOrder carries its own id; Custody expects the envelope
    // id to match it, so a caller who doesn't override id must still get them
    // in sync rather than a fresh random envelope id.
    const order = (
      await buildProposeIntentBody(signer, {
        domainId: DOMAIN,
        authorUserId: AUTHOR,
        accountId: 'account-1',
        transaction: payment,
        idempotencyKey: 'order-id-1',
      })
    ).request.payload

    await api.propose(order)

    expect(proposedBody(http).request.id).toBe('order-id-1')
  })

  it('returns the Custody intent acknowledgement', async () => {
    const { api } = apiOn({ requestId: 'req-42' })

    const response = await api.propose(RELEASE_PAYLOAD)

    expect(response.requestId).toBe('req-42')
  })
})

describe('CustodyApi.request', () => {
  it('reaches an endpoint with no operationId, by method and path', async () => {
    const { api, http } = apiOn({ id: 'inv-1' })
    const invitation = { email: 'ops@example.com' } as never

    await api.request('POST', '/v1/domains/{domainId}/users/invitations', {
      path: { domainId: 'D' },
      body: invitation,
    })

    expect(http.requests[0]?.method).toBe('POST')
    expect(http.requests[0]?.url).toBe(
      `${GATEWAY}/v1/domains/D/users/invitations`,
    )
    expect(JSON.parse(http.requests[0]?.body ?? '{}')).toEqual(invitation)
  })

  it('appends query params and needs no body on a GET', async () => {
    const { api, http } = apiOn({ items: [] })

    await api.request('GET', '/v1/domains/{domainId}/users/invitations', {
      path: { domainId: 'D' },
      query: { limit: 5 },
    })

    expect(http.requests[0]?.url).toBe(
      `${GATEWAY}/v1/domains/D/users/invitations?limit=5`,
    )
    expect(http.requests[0]?.body).toBeUndefined()
  })

  it('throws when a required path parameter is missing', async () => {
    const { api, http } = apiOn()

    await expect(
      api.request('GET', '/v1/domains/{domainId}/users/invitations'),
    ).rejects.toThrow(/Missing path parameter 'domainId'/u)
    expect(http.requests).toHaveLength(0)
  })

  it('is checked against the Custody version, like call', async () => {
    // GET /v1/health arrived in 1.36.
    const { api, http } = apiOn(
      {},
      new VersionGuard(pinnedCapabilities('1.35')),
    )

    await expect(api.request('GET', '/v1/health')).rejects.toThrow(
      UnsupportedInVersionError,
    )
    await expect(api.request('GET', '/v1/health')).rejects.toMatchObject({
      sdkMethod: "api.request('GET', '/v1/health')",
    })
    expect(http.requests).toHaveLength(0)
  })

  it('accepts only the methods a path serves', () => {
    const { api } = apiOn()

    // Compile-time checks: these never run.
    const wrongMethod = async (): Promise<unknown> =>
      // @ts-expect-error -- /v1/health serves no POST
      api.request('POST', '/v1/health')
    const unknownPath = async (): Promise<unknown> =>
      // @ts-expect-error -- not a Custody path
      api.request('GET', '/v1/not-a-path')

    expect([wrongMethod, unknownPath]).toHaveLength(2)
  })
})

describe('CustodyApi.approve / reject', () => {
  const INTENT_ID = 'intent-7'
  const PROPOSAL_SIGNATURE = 'cHJvcG9zYWwtc2lnbmF0dXJl'
  const TARGET_DOMAIN = 'domain-target'

  /**
   * Answer the intent fetch with an intent, and the decision with an ack.
   *
   * @param request - The recorded request.
   * @returns The fake Custody response.
   */
  const custody = (request: HttpRequest): HttpResponse => {
    if (request.method === 'GET') {
      const intent = intentBody(INTENT_ID, 'Open') as {
        data: { details: Record<string, unknown> }
      }
      intent.data.details.proposalSignature = PROPOSAL_SIGNATURE
      intent.data.details.targetDomainId = TARGET_DOMAIN
      return ok(intent)
    }
    return ok({ requestId: 'decision-1' })
  }

  /**
   * The signed body a recorded decision POST carried.
   *
   * @param http - The recording HTTP port.
   * @returns The posted body.
   */
  const decisionBody = (
    http: FakeHttpPort,
  ): { request: Record<string, unknown>; signature: string } =>
    JSON.parse(http.requests[1]?.body ?? '{}') as {
      request: Record<string, unknown>
      signature: string
    }

  it('fetches the intent, then posts an approval signed by the API user key', async () => {
    const { api, http } = apiOn(custody)

    const response = await api.approve(INTENT_ID, { reason: 'within limits' })

    expect(http.requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
      `GET ${GATEWAY}/v1/domains/${DOMAIN}/intents/${INTENT_ID}`,
      `POST ${GATEWAY}/v1/intents/approve`,
    ])
    const body = decisionBody(http)
    expect(body.request).toEqual({
      type: 'Approve',
      author: { id: AUTHOR, domainId: DOMAIN },
      targetDomainId: TARGET_DOMAIN,
      intentId: INTENT_ID,
      proposalSignature: PROPOSAL_SIGNATURE,
      approvalReason: 'within limits',
    })
    // ed25519 is deterministic: the same key over the same request agrees.
    expect(body.signature).toBe(
      await IntentSigner.fromPrivateKey(KEY).signRequest(body.request),
    )
    expect(response).toEqual({ requestId: 'decision-1' })
  })

  it('leaves approvalReason out when no reason is given', async () => {
    const { api, http } = apiOn(custody)

    await api.approve(INTENT_ID)

    expect(decisionBody(http).request).not.toHaveProperty('approvalReason')
  })

  it('posts a rejection with its reason', async () => {
    const { api, http } = apiOn(custody)

    await api.reject(INTENT_ID, { reason: 'unexpected destination' })

    expect(http.requests[1]?.url).toBe(`${GATEWAY}/v1/intents/reject`)
    expect(decisionBody(http).request).toMatchObject({
      type: 'Reject',
      intentId: INTENT_ID,
      proposalSignature: PROPOSAL_SIGNATURE,
      rejectReason: 'unexpected destination',
    })
  })

  it('refuses a rejection with no reason, and a reason over 5000 characters', async () => {
    const { api, http } = apiOn(custody)

    await expect(api.reject(INTENT_ID, { reason: '' })).rejects.toThrow(
      'api.reject needs a reason',
    )
    await expect(
      api.approve(INTENT_ID, { reason: 'x'.repeat(5001) }),
    ).rejects.toThrow(SimpleXRPLError)
    expect(http.requests).toHaveLength(0)
  })
})
