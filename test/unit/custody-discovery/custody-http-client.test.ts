import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import {
  CustodyApiError,
  CustodyAuthError,
  CustodyPermissionError,
  CustodySignatureError,
  SimpleXRPLError,
} from '../../../src/errors.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'

import { FakeHttpPort, ok, status } from './test-utils.js'

const KEY = generateTestKey('ed25519')
const GATEWAY = 'https://custody.example.com'

/**
 * Await a call expected to fail.
 *
 * @param call - The pending call.
 * @returns What it rejected with.
 */
async function failureOf(call: Promise<unknown>): Promise<unknown> {
  try {
    await call
  } catch (error) {
    return error
  }
  throw new Error('expected the call to fail')
}

function makeAuth(): { auth: CustodyAuthService; authPort: FakeAuthPort } {
  const authPort = new FakeAuthPort(makeJwt({ exp: 9_999_999_999 }))
  return {
    auth: new CustodyAuthService({ authPort, privateKey: KEY }),
    authPort,
  }
}

describe('CustodyHttpClient', () => {
  it('rejects a non-HTTPS gateway URL', () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({}))
    expect(
      () =>
        new CustodyHttpClient({ gatewayUrl: 'http://insecure', http, auth }),
    ).toThrow(SimpleXRPLError)
  })

  it('injects a bearer token and returns the parsed body', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({ hello: 'world' }))
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    const result = await client.get<{ hello: string }>('/v1/thing')

    expect(result).toEqual({ hello: 'world' })
    expect(http.requests[0]?.headers.Authorization).toMatch(/^Bearer /u)
  })

  it('appends scalar query params and drops undefined', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({}))
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    await client.get('/v1/accounts', { limit: 100, startingAfter: undefined })

    expect(http.requests[0]?.url).toBe(
      'https://custody.example.com/v1/accounts?limit=100',
    )
  })

  it('on 401 refreshes the token once and replays the request', async () => {
    const { auth, authPort } = makeAuth()
    // First API call 401s; after the forced refresh the replay succeeds.
    const http = new FakeHttpPort((_req, callIndex) => {
      return callIndex === 0 ? status(401) : ok({ ok: true })
    })
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    const result = await client.get<{ ok: boolean }>('/v1/thing')

    expect(result).toEqual({ ok: true })
    // original request + one replay
    expect(http.requests).toHaveLength(2)
    // initial token + one forced refresh
    expect(authPort.calls).toHaveLength(2)
  })

  it('throws CustodyAuthError when a second 401 follows the retry', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => status(401))
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    await expect(client.get('/v1/thing')).rejects.toBeInstanceOf(
      CustodyAuthError,
    )
  })

  describe('reports a 401 that survives the refresh by Custody’s reason', () => {
    it.each([
      ['InvalidSignatureError', CustodySignatureError],
      ['PermissionDeniedError', CustodyPermissionError],
    ] as const)('%s as %p', async (reason, ErrorClass) => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() =>
        status(401, { reason, message: 'refused' }),
      )
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const failure = client.get('/v1/thing')

      await expect(failure).rejects.toBeInstanceOf(ErrorClass)
      await expect(failure).rejects.toMatchObject({
        message: `Custody API error (401 ${reason}): refused`,
        apiError: { status: 401, reason, detail: 'refused' },
      })
    })

    it('and any other reason as a plain CustodyAuthError', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() =>
        status(401, { reason: 'InvalidJwtError', message: 'expired' }),
      )
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const error = await failureOf(client.get('/v1/thing'))

      expect(error).toBeInstanceOf(CustodyAuthError)
      expect(error).not.toBeInstanceOf(CustodySignatureError)
      expect(error).not.toBeInstanceOf(CustodyPermissionError)
      expect((error as CustodyAuthError).apiError?.reason).toBe(
        'InvalidJwtError',
      )
    })
  })

  describe('hints at a known Custody server bug', () => {
    const SIGNATURE_FAILURE = {
      reason: 'InvalidSignatureError',
      message: 'invalid signature',
    }

    it('when a quarantineStatus filter gets a 500', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() =>
        status(500, { reason: 'InternalError', message: 'oops' }),
      )
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const failure = client.get('/v1/domains/d/transfers', {
        quarantineStatus: 'Quarantined',
      })

      await expect(failure).rejects.toMatchObject({
        status: 500,
        hint: expect.stringContaining('`quarantined: true`') as unknown,
      })
      await expect(failure).rejects.toThrow(
        /\(500 InternalError\): oops\nThe request filtered on `quarantineStatus`/u,
      )
    })

    it('not for a 500 without the filter', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() => status(500))
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      await expect(
        client.get('/v1/domains/d/transfers', { quarantined: true }),
      ).rejects.toMatchObject({ hint: undefined })
    })

    it('when a signed body with a 5+ element array fails verification', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() => status(401, SIGNATURE_FAILURE))
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const failure = client.post('/v1/intents', {
        request: {
          payload: { flags: ['a', 'b', 'c', 'd', 'e'], memos: ['x'] },
        },
        signature: 'c2ln',
      })

      await expect(failure).rejects.toBeInstanceOf(CustodySignatureError)
      await expect(failure).rejects.toMatchObject({
        apiError: {
          hint: expect.stringContaining(
            'array field(s) with 5+ elements (`request.payload.flags`)',
          ) as unknown,
        },
      })
    })

    it('naming nested large arrays by their full path', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() => status(401, SIGNATURE_FAILURE))
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const error = (await failureOf(
        client.post('/v1/intents', {
          request: { orders: [{ flags: [1, 2, 3, 4, 5] }] },
          signature: 'c2ln',
        }),
      )) as CustodyAuthError

      expect(error.apiError?.hint).toContain('`request.orders[0].flags`')
    })

    it.each([
      [
        'no array is that large',
        { request: { flags: [1, 2, 3, 4] }, signature: 's' },
      ],
      ['the body is not signed', { request: { flags: [1, 2, 3, 4, 5] } }],
    ])('not when %s', async (_case, body) => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() => status(401, SIGNATURE_FAILURE))
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const error = (await failureOf(
        client.post('/v1/intents', body),
      )) as CustodyAuthError

      expect(error).toBeInstanceOf(CustodySignatureError)
      expect(error.apiError?.hint).toBeUndefined()
    })

    it('not for another 401 reason, or a bodiless request', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() => status(401, SIGNATURE_FAILURE))
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      const error = (await failureOf(
        client.get('/v1/thing'),
      )) as CustodyAuthError
      expect(error.apiError?.hint).toBeUndefined()

      const denied = new FakeHttpPort(() =>
        status(401, { reason: 'PermissionDeniedError' }),
      )
      const deniedClient = new CustodyHttpClient({
        gatewayUrl: GATEWAY,
        http: denied,
        auth,
      })
      const deniedError = (await failureOf(
        deniedClient.post('/v1/intents', {
          request: { flags: [1, 2, 3, 4, 5] },
          signature: 's',
        }),
      )) as CustodyAuthError
      expect(deniedError.apiError?.hint).toBeUndefined()
    })
  })

  it('maps a 4xx body to CustodyApiError preserving status and hint', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() =>
      status(422, { processing: { hint: 'policy rejected' } }),
    )
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    let error: unknown
    try {
      await client.get('/v1/thing')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(CustodyApiError)
    expect((error as CustodyApiError).status).toBe(422)
    expect((error as CustodyApiError).hint).toBe('policy rejected')
  })

  it('POSTs a JSON body with the JSON content type', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({ created: true }))
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    const result = await client.post<{ created: boolean }>('/v1/orders', {
      amount: '10',
    })

    expect(result).toEqual({ created: true })
    const [request] = http.requests
    expect(request.method).toBe('POST')
    expect(request.headers['Content-Type']).toBe('application/json')
    expect(request.body).toBe(JSON.stringify({ amount: '10' }))
  })

  it('returns undefined for an empty 2xx body', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ({ status: 200, body: '' }))
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    await expect(client.get('/v1/void')).resolves.toBeUndefined()
  })

  it('maps a non-JSON error body to CustodyApiError with no hint but raw preserved', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ({
      status: 500,
      body: 'Internal Server Error',
    }))
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

    let error: unknown
    try {
      await client.get('/v1/thing')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(CustodyApiError)
    expect((error as CustodyApiError).status).toBe(500)
    expect((error as CustodyApiError).hint).toBeUndefined()
    expect((error as CustodyApiError).raw).toBe('Internal Server Error')
  })

  describe('bounds every request with a timeout', () => {
    it('of 30 s by default, on the original call and the 401 replay', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort((_req, callIndex) => {
        return callIndex === 0 ? status(401) : ok({})
      })
      const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })

      await client.get('/v1/thing')

      expect(http.requests.map((request) => request.timeoutMs)).toEqual([
        30_000, 30_000,
      ])
    })

    it('of the configured timeoutMs', async () => {
      const { auth } = makeAuth()
      const http = new FakeHttpPort(() => ok({}))
      const client = new CustodyHttpClient({
        gatewayUrl: GATEWAY,
        http,
        auth,
        timeoutMs: 5000,
      })

      await client.post('/v1/orders', {})

      expect(http.requests[0]?.timeoutMs).toBe(5000)
    })
  })

  it('normalizes a trailing-slash gateway URL (no double slash)', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({}))
    const client = new CustodyHttpClient({
      gatewayUrl: 'https://custody.example.com/',
      http,
      auth,
    })

    await client.get('/v1/thing')

    expect(http.requests[0]?.url).toBe('https://custody.example.com/v1/thing')
  })
})
