import {
  CustodyApiError,
  CustodyAuthError,
  SimpleXRPLError,
} from '../../../src/core/errors.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'

import { FakeHttpPort, ok, status } from './test-utils.js'

const KEY = generateTestKey('ed25519')
const GATEWAY = 'https://custody.example.com'

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
})
