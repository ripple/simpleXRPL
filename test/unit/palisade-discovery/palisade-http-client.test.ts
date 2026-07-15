import { PalisadeAuthService } from '../../../src/custodians/palisade/auth/palisade-auth.service.js'
import { PalisadeHttpClient } from '../../../src/custodians/palisade/transport/palisade-http-client.js'
import {
  PalisadeApiError,
  PalisadeAuthError,
  SimpleXRPLError,
} from '../../../src/errors.js'
import { FakeAuthPort } from '../palisade-auth/test-utils.js'

import { FakeHttpPort, ok, status } from './test-utils.js'

const BASE_URL = 'https://api.palisade.co'
const ONE_HOUR_S = 3600

function makeAuth(): {
  auth: PalisadeAuthService
  authPort: FakeAuthPort
} {
  const authPort = new FakeAuthPort({
    accessToken: 'jwt-1',
    expiresIn: ONE_HOUR_S,
  })
  return {
    auth: new PalisadeAuthService({
      authPort,
      clientId: 'client-1',
      clientSecret: 'secret-1',
    }),
    authPort,
  }
}

describe('PalisadeHttpClient', () => {
  it('rejects a non-HTTPS base URL', () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({}))
    expect(
      () => new PalisadeHttpClient({ baseUrl: 'http://insecure', http, auth }),
    ).toThrow(SimpleXRPLError)
  })

  it('injects a bearer token and returns the parsed body', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({ hello: 'world' }))
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    const result = await client.get<{ hello: string }>('/v2/thing')

    expect(result).toEqual({ hello: 'world' })
    expect(http.requests[0]?.headers.Authorization).toMatch(/^Bearer /u)
  })

  it('appends scalar query params and drops undefined', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({}))
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    await client.get('/v2/wallets', {
      blockchain: 'XRP_LEDGER',
      pageToken: undefined,
    })

    expect(http.requests[0]?.url).toBe(
      'https://api.palisade.co/v2/wallets?blockchain=XRP_LEDGER',
    )
  })

  it('on 401 refreshes the token once and replays the request', async () => {
    const { auth, authPort } = makeAuth()
    const http = new FakeHttpPort((_req, callIndex) => {
      return callIndex === 0 ? status(401) : ok({ ok: true })
    })
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    const result = await client.get<{ ok: boolean }>('/v2/thing')

    expect(result).toEqual({ ok: true })
    // original request + one replay
    expect(http.requests).toHaveLength(2)
    // initial token + one forced refresh
    expect(authPort.calls).toHaveLength(2)
  })

  it('throws PalisadeAuthError when a second 401 follows the retry', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => status(401))
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    await expect(client.get('/v2/thing')).rejects.toBeInstanceOf(
      PalisadeAuthError,
    )
  })

  it('maps a 4xx body to PalisadeApiError preserving the rpcStatus message', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() =>
      status(422, { message: 'policy rejected' }),
    )
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    let error: unknown
    try {
      await client.get('/v2/thing')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(PalisadeApiError)
    expect((error as PalisadeApiError).status).toBe(422)
    expect((error as PalisadeApiError).hint).toBe('policy rejected')
  })

  it('POSTs a JSON body with the JSON content type', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({ created: true }))
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    const result = await client.post<{ created: boolean }>('/v2/orders', {
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
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    await expect(client.get('/v2/void')).resolves.toBeUndefined()
  })

  it('maps a non-JSON error body to PalisadeApiError with raw preserved', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ({
      status: 500,
      body: 'Internal Server Error',
    }))
    const client = new PalisadeHttpClient({ baseUrl: BASE_URL, http, auth })

    let error: unknown
    try {
      await client.get('/v2/thing')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(PalisadeApiError)
    expect((error as PalisadeApiError).status).toBe(500)
    expect((error as PalisadeApiError).raw).toBe('Internal Server Error')
  })

  it('normalizes a trailing-slash base URL (no double slash)', async () => {
    const { auth } = makeAuth()
    const http = new FakeHttpPort(() => ok({}))
    const client = new PalisadeHttpClient({
      baseUrl: 'https://api.palisade.co/',
      http,
      auth,
    })

    await client.get('/v2/thing')

    expect(http.requests[0]?.url).toBe('https://api.palisade.co/v2/thing')
  })
})
