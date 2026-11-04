import type { Payment } from 'xrpl'

import { CustodyApi } from '../../../src/custodians/ripple/api.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import type { CustodyAddressReference } from '../../../src/custodians/ripple/discovery/address-lookup.js'
import { buildProposeIntentBody } from '../../../src/custodians/ripple/mapping/envelope.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import { pinnedCapabilities } from '../../../src/custodians/ripple/versioning/capabilities.js'
import { VersionGuard } from '../../../src/custodians/ripple/versioning/version-guard.js'
import {
  AccountNotFoundError,
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

    const { intentId } = await api.propose(order)

    expect(proposedBody(http).request.id).toBe('order-id-1')
    expect(intentId).toBe('order-id-1')
  })

  it('returns the Custody acknowledgement and the signed intent id', async () => {
    const { api, http } = apiOn({ requestId: 'req-42' })

    const response = await api.propose(RELEASE_PAYLOAD)

    // Custody acks with only a requestId; the intent id the envelope was
    // signed under is the handle for everything after, so propose returns it.
    expect(response.requestId).toBe('req-42')
    expect(response.intentId).toBe(proposedBody(http).request.id)
    expect(response.intentId).toBeTruthy()
  })

  it('returns the overridden id as the intent id', async () => {
    const { api } = apiOn()

    const { intentId } = await api.propose(RELEASE_PAYLOAD, { id: 'idem-1' })

    expect(intentId).toBe('idem-1')
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

/**
 * Answer each request with the page its `startingAfter` cursor names.
 *
 * @param pages - The pages, keyed by cursor (`''` for the first).
 * @returns A request handler.
 */
function pagedBy(
  pages: Readonly<Record<string, unknown>>,
): (request: HttpRequest) => HttpResponse {
  return (request) =>
    ok(pages[new URL(request.url).searchParams.get('startingAfter') ?? ''])
}

/**
 * An account address reference, as `GET /v1/addresses` lists it.
 *
 * @param overrides - Fields to change.
 * @returns The reference.
 */
function addressRef(
  overrides: Partial<CustodyAddressReference> = {},
): CustodyAddressReference {
  return {
    id: 'ref-1',
    type: 'AccountAddressReference',
    address: 'rHolder',
    ledgerId: 'xrpl-testnet',
    domainId: DOMAIN,
    accountId: 'account-1',
    createdAt: '2026-01-01T00:00:00Z',
    custodyType: 'SubCustody',
    ...overrides,
  }
}

describe('CustodyApi.paginate', () => {
  it('follows the cursor across pages, keeping the caller’s query', async () => {
    const { api, http } = apiOn(
      pagedBy({
        '': {
          items: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
          count: 2,
          nextStartingAfter: 'page2',
        },
        page2: {
          items: [{ data: { id: 'c' } }],
          count: 1,
          nextStartingAfter: null,
        },
      }),
    )

    const ids: string[] = []
    for await (const account of api.paginate('getAccounts', {
      path: { domainId: 'D' },
      query: { limit: 2 },
    })) {
      ids.push(account.data.id)
    }

    expect(ids).toEqual(['a', 'b', 'c'])
    expect(http.requests.map((request) => request.url)).toEqual([
      `${GATEWAY}/v1/domains/D/accounts?limit=2`,
      `${GATEWAY}/v1/domains/D/accounts?limit=2&startingAfter=page2`,
    ])
  })

  it('resumes after a startingAfter the caller passes', async () => {
    const { api, http } = apiOn({ items: [], count: 0 })

    for await (const _ledger of api.paginate('getLedgers', {
      query: { startingAfter: 'x' },
    })) {
      // none
    }

    expect(http.requests[0]?.url).toBe(`${GATEWAY}/v1/ledgers?startingAfter=x`)
  })

  it('is checked against the Custody version before any request', () => {
    // GET /v1/health is not paginated; GET /v1/addresses arrived in 1.21.
    const { api, http } = apiOn(
      {},
      new VersionGuard(pinnedCapabilities('1.15')),
    )

    expect(() =>
      api.paginate('getAllDomainsAddresses', { query: { address: 'r' } }),
    ).toThrow(UnsupportedInVersionError)
    expect(http.requests).toHaveLength(0)
  })

  it('accepts only operations whose response is paginated', () => {
    const { api } = apiOn()

    // Compile-time check: this never runs.
    const notPaginated = async (): Promise<unknown> =>
      // @ts-expect-error -- getMe returns a single object, not a page
      api.paginate('getMe')

    expect(notPaginated).toBeInstanceOf(Function)
  })
})

describe('CustodyApi.findByAddress', () => {
  it('reads every page and returns the account address', async () => {
    const match = addressRef({ id: 'ref-2' })
    const { api, http } = apiOn(
      pagedBy({
        '': {
          items: [{ id: 'other', type: 'DepositInstructionsReference' }],
          count: 1,
          nextStartingAfter: 'other',
        },
        other: { items: [match], count: 1 },
      }),
    )

    await expect(api.findByAddress('rHolder')).resolves.toEqual(match)
    expect(http.requests.map((request) => request.url)).toEqual([
      `${GATEWAY}/v1/addresses?address=rHolder`,
      `${GATEWAY}/v1/addresses?address=rHolder&startingAfter=other`,
    ])
  })

  it('returns undefined when no account holds the address', async () => {
    // Custody matches loosely; only the exact address counts.
    const { api } = apiOn({
      items: [addressRef({ address: 'rHolderX' })],
      count: 1,
    })

    await expect(api.findByAddress('rHolder')).resolves.toBeUndefined()
  })

  it('narrows by ledgerId and domainId', async () => {
    const onMainnet = addressRef({ id: 'm', ledgerId: 'xrpl' })
    const elsewhere = addressRef({ id: 'e', domainId: 'domain-2' })
    const { api } = apiOn({
      items: [addressRef(), onMainnet, elsewhere],
      count: 3,
    })

    await expect(
      api.findByAddress('rHolder', { ledgerId: 'xrpl' }),
    ).resolves.toEqual(onMainnet)
    await expect(
      api.findByAddress('rHolder', { domainId: 'domain-2' }),
    ).resolves.toEqual(elsewhere)
  })

  it('throws when one account holds the address on several ledgers', async () => {
    const { api } = apiOn({
      items: [addressRef(), addressRef({ id: 'm', ledgerId: 'xrpl' })],
      count: 2,
    })

    await expect(api.findByAddress('rHolder')).rejects.toThrow(
      `Custody account account-1 in domain ${DOMAIN} holds rHolder on 2 ledgers (xrpl-testnet, xrpl); pass ledgerId to pick one`,
    )
  })

  it('throws when several accounts hold the address', async () => {
    const { api } = apiOn({
      items: [
        addressRef(),
        addressRef({ id: 'x', domainId: 'domain-2', accountId: 'account-2' }),
      ],
      count: 2,
    })

    await expect(api.findByAddress('rHolder')).rejects.toThrow(
      /^2 Custody accounts hold rHolder \(account account-1 in domain domain-1 on ledger xrpl-testnet; account account-2 in domain domain-2 on ledger xrpl-testnet\); pass ledgerId and\/or domainId to pick one$/u,
    )
  })

  it('is checked against the Custody version', async () => {
    const { api, http } = apiOn(
      {},
      new VersionGuard(pinnedCapabilities('1.15')),
    )

    await expect(api.findByAddress('rHolder')).rejects.toMatchObject({
      sdkMethod: 'api.findByAddress',
    })
    expect(http.requests).toHaveLength(0)
  })
})

/**
 * Route requests by method and path fragment, recording nothing extra.
 *
 * @param routes - `[method, fragment, body]` triples; the first match answers.
 * @returns A request handler.
 */
function routed(
  routes: ReadonlyArray<readonly [string, string, unknown]>,
): (request: HttpRequest) => HttpResponse {
  return (request) => {
    const route = routes.find(
      ([method, fragment]) =>
        request.method === method && request.url.includes(fragment),
    )
    if (route === undefined) {
      throw new Error(`unexpected ${request.method} ${request.url}`)
    }
    return ok(route[2])
  }
}

describe('CustodyApi.waitForIntent', () => {
  it('reads the intent in the custodian’s domain and reports how it ended', async () => {
    const { api, http } = apiOn(
      routed([['GET', '/intents/i-1', intentBody('i-1', 'Executed')]]),
    )

    const outcome = await api.waitForIntent('i-1')

    expect(outcome).toMatchObject({
      intentId: 'i-1',
      status: 'Executed',
      isSuccess: true,
      isTerminal: true,
    })
    expect(http.requests[0]?.url).toBe(
      `${GATEWAY}/v1/domains/${DOMAIN}/intents/i-1`,
    )
  })

  it('reports a rejected intent instead of throwing', async () => {
    const { api } = apiOn(
      routed([
        [
          'GET',
          '/intents/i-1',
          intentBody('i-1', 'Rejected', { code: 'Rejected', message: 'no' }),
        ],
      ]),
    )

    await expect(api.waitForIntent('i-1')).resolves.toMatchObject({
      isTerminal: true,
      isSuccess: false,
      reason:
        'Custody intent i-1 did not execute: status=Rejected (Rejected: no)',
    })
  })

  it('reads another domain when asked, and waits 60 s by default', async () => {
    jest.useFakeTimers()
    try {
      const { api, http } = apiOn(
        routed([['GET', '/intents/i-1', intentBody('i-1', 'Open')]]),
      )

      const promise = api.waitForIntent('i-1', { domainId: 'domain-2' })
      await jest.advanceTimersByTimeAsync(70_000)

      await expect(promise).resolves.toMatchObject({
        status: 'Open',
        isTerminal: false,
        reason: expect.stringContaining('still Open after 60000 ms') as unknown,
      })
      expect(http.requests[0]?.url).toContain(
        '/v1/domains/domain-2/intents/i-1',
      )
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('CustodyApi.proposeAndWait', () => {
  it('proposes, then reports the outcome with the request and intent ids', async () => {
    const { api, http } = apiOn((request: HttpRequest): HttpResponse => {
      if (request.method === 'POST') {
        return ok({ requestId: 'req-1' })
      }
      const intentId = request.url.split('/').pop() ?? ''
      return ok(
        intentBody(intentId, 'Expired', { code: 'Expired', message: 'late' }),
      )
    })

    const result = await api.proposeAndWait(RELEASE_PAYLOAD, { id: 'idem-1' })

    expect(result).toMatchObject({
      requestId: 'req-1',
      intentId: 'idem-1',
      status: 'Expired',
      isTerminal: true,
      isSuccess: false,
    })
    expect(proposedBody(http).request.id).toBe('idem-1')
    expect(http.requests[1]?.url).toContain(
      `/v1/domains/${DOMAIN}/intents/idem-1`,
    )
  })

  it('waits in the target domain the intent was proposed into', async () => {
    const { api, http } = apiOn((request: HttpRequest): HttpResponse => {
      return request.method === 'POST'
        ? ok({ requestId: 'req-1' })
        : ok(intentBody('idem-1', 'Executed'))
    })

    await api.proposeAndWait(RELEASE_PAYLOAD, {
      id: 'idem-1',
      targetDomainId: 'domain-2',
    })

    expect(http.requests[1]?.url).toContain(
      '/v1/domains/domain-2/intents/idem-1',
    )
  })
})

describe('CustodyApi.dryRun', () => {
  it('posts the unsigned envelope propose would send, and returns the verdict', async () => {
    const verdict = {
      success: false,
      errors: ['no transfers to release'],
      type: 'v0_ReleaseQuarantinedTransfers',
    }
    const { api, http } = apiOn(
      routed([['POST', '/v1/intents/dry-run', verdict]]),
    )

    const response = await api.dryRun(RELEASE_PAYLOAD, { id: 'idem-1' })

    // A failed verdict is an answer, not an error.
    expect(response).toEqual(verdict)
    const body = JSON.parse(http.requests[0]?.body ?? '{}') as Record<
      string,
      unknown
    >
    expect(body).toMatchObject({
      id: 'idem-1',
      author: { id: AUTHOR, domainId: DOMAIN },
      targetDomainId: DOMAIN,
      payload: RELEASE_PAYLOAD,
      customProperties: {},
    })
    expect(body).not.toHaveProperty('signature')
    expect(body).not.toHaveProperty('type')
  })

  it('is checked against the Custody version', async () => {
    // v0_CreateBackup arrived in 1.28.
    const { api, http } = apiOn(
      {},
      new VersionGuard(pinnedCapabilities('1.15')),
    )

    await expect(
      api.dryRun({ type: 'v0_CreateBackup' } as never),
    ).rejects.toMatchObject({
      constructor: UnsupportedInVersionError,
      sdkMethod: 'api.dryRun',
    })
    expect(http.requests).toHaveLength(0)
  })
})

describe('CustodyApi.dryRunTransaction', () => {
  const payment: Payment = {
    TransactionType: 'Payment',
    Account: 'rHolder',
    Destination: 'rTo',
    Amount: '1000',
  }
  const estimate = {
    success: true,
    result: { type: 'Success' },
    estimate: {
      type: 'XRPL',
      fee: '12',
      minimumCostInDrops: '12',
    },
    type: 'v0_CreateTransactionOrder',
  }

  it('finds the sending account, maps the transaction, and returns the estimate', async () => {
    const { api, http } = apiOn(
      routed([
        ['GET', '/v1/addresses', { items: [addressRef()], count: 1 }],
        ['POST', '/v1/intents/dry-run', estimate],
      ]),
    )

    const response = await api.dryRunTransaction(payment)

    expect(response).toEqual(estimate)
    expect(http.requests[0]?.url).toBe(
      `${GATEWAY}/v1/addresses?address=rHolder`,
    )
    const body = JSON.parse(http.requests[1]?.body ?? '{}') as {
      id: string
      payload: {
        id: string
        accountId: string
        ledgerId: string
        type: string
        parameters: { operation: { type: string }; feeStrategy: unknown }
      }
    }
    expect(body.payload).toMatchObject({
      accountId: 'account-1',
      ledgerId: 'xrpl-testnet',
      type: 'v0_CreateTransactionOrder',
      parameters: {
        operation: { type: 'Payment' },
        feeStrategy: { type: 'Priority', priority: 'Low' },
      },
    })
    // The envelope mirrors the proposal: its id is the payload's.
    expect(body.id).toBe(body.payload.id)
  })

  it('throws AccountNotFoundError when no account in the domain holds the sender', async () => {
    const { api } = apiOn(
      routed([
        [
          'GET',
          '/v1/addresses',
          { items: [addressRef({ domainId: 'domain-2' })], count: 1 },
        ],
      ]),
    )

    await expect(api.dryRunTransaction(payment)).rejects.toBeInstanceOf(
      AccountNotFoundError,
    )
  })

  it('is checked against the Custody version before any request', async () => {
    // Native AccountSet is missing from official 1.23–1.31.
    const { api, http } = apiOn(
      {},
      new VersionGuard(pinnedCapabilities('1.25')),
    )

    await expect(
      api.dryRunTransaction({
        TransactionType: 'AccountSet',
        Account: 'rHolder',
      }),
    ).rejects.toBeInstanceOf(UnsupportedInVersionError)
    expect(http.requests).toHaveLength(0)
  })
})
