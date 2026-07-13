import { PalisadeAuthError } from '../../../src/errors.js'
import { HttpPalisadeAuthPort } from '../../../src/custodians/palisade/transport/http-palisade-auth-port.js'

import { FakeHttpPort, ok, status } from './test-utils.js'

const BASE_URL = 'https://api.palisade.co'
const ONE_HOUR_S = 3600

describe('HttpPalisadeAuthPort', () => {
  it('rejects a non-HTTPS base URL', () => {
    const http = new FakeHttpPort(() => ok({}))
    expect(
      () => new HttpPalisadeAuthPort({ baseUrl: 'http://insecure', http }),
    ).toThrow(PalisadeAuthError)
  })

  it('POSTs the JSON credential body to the exchange endpoint', async () => {
    const http = new FakeHttpPort(() =>
      ok({ accessToken: 'jwt-123', expiresIn: ONE_HOUR_S }),
    )
    const port = new HttpPalisadeAuthPort({ baseUrl: BASE_URL, http })

    const result = await port.exchangeCredential('client-1', 'secret-1')

    expect(result).toEqual({ accessToken: 'jwt-123', expiresIn: ONE_HOUR_S })
    const [request] = http.requests
    expect(request.method).toBe('POST')
    expect(request.url).toBe(
      'https://api.palisade.co/v2/credentials/oauth/token',
    )
    expect(request.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(request.body ?? '{}')).toEqual({
      clientId: 'client-1',
      clientSecret: 'secret-1',
    })
  })

  it('normalizes a trailing-slash base URL', async () => {
    const http = new FakeHttpPort(() =>
      ok({ accessToken: 'jwt-123', expiresIn: ONE_HOUR_S }),
    )
    const port = new HttpPalisadeAuthPort({
      baseUrl: 'https://api.palisade.co/',
      http,
    })

    await port.exchangeCredential('client-1', 'secret-1')

    expect(http.requests[0]?.url).toBe(
      'https://api.palisade.co/v2/credentials/oauth/token',
    )
  })

  it('throws PalisadeAuthError on a non-2xx response', async () => {
    const http = new FakeHttpPort(() => status(401, { message: 'bad' }))
    const port = new HttpPalisadeAuthPort({ baseUrl: BASE_URL, http })
    await expect(
      port.exchangeCredential('client-1', 'secret-1'),
    ).rejects.toBeInstanceOf(PalisadeAuthError)
  })

  it('throws when the response has no accessToken', async () => {
    const http = new FakeHttpPort(() => ok({ tokenType: 'Bearer' }))
    const port = new HttpPalisadeAuthPort({ baseUrl: BASE_URL, http })
    await expect(
      port.exchangeCredential('client-1', 'secret-1'),
    ).rejects.toThrow(/no accessToken/u)
  })
})
