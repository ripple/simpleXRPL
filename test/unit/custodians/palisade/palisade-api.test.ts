import { PalisadeApi } from '../../../../src/custodians/palisade/api.js'
import { PalisadeAuthService } from '../../../../src/custodians/palisade/auth/palisade-auth.service.js'
import { HttpPalisadeAuthPort } from '../../../../src/custodians/palisade/transport/http-palisade-auth-port.js'
import type {
  HttpRequest,
  HttpResponse,
  PalisadeHttpPort,
} from '../../../../src/custodians/palisade/transport/http-port.js'
import { PalisadeHttpClient } from '../../../../src/custodians/palisade/transport/palisade-http-client.js'

const BASE_URL = 'https://palisade.example'

interface RecordingPort extends PalisadeHttpPort {
  readonly requests: HttpRequest[]
}

/**
 * A fake port that answers the token exchange and records every other request.
 *
 * @param responseBody - The JSON body returned for recorded (API) requests.
 * @returns The recording port.
 */
function recordingPort(responseBody: unknown = {}): RecordingPort {
  const requests: HttpRequest[] = []
  return {
    requests,
    async send(request: HttpRequest): Promise<HttpResponse> {
      if (request.url.includes('/credentials/oauth/token')) {
        return {
          status: 200,
          body: JSON.stringify({ accessToken: 'tok', expiresIn: 3600 }),
        }
      }
      requests.push(request)
      return { status: 200, body: JSON.stringify(responseBody) }
    },
  }
}

/**
 * Build an authenticated client over a port.
 *
 * @param port - The transport port.
 * @returns The client.
 */
function clientOn(port: PalisadeHttpPort): PalisadeHttpClient {
  return new PalisadeHttpClient({
    baseUrl: BASE_URL,
    http: port,
    auth: new PalisadeAuthService({
      authPort: new HttpPalisadeAuthPort({ baseUrl: BASE_URL, http: port }),
      clientId: 'id',
      clientSecret: 'secret',
    }),
  })
}

describe('PalisadeApi.call', () => {
  it('routes a GET to the wallet-read client and interpolates path params', async () => {
    const read = recordingPort({ balances: [] })
    const write = recordingPort()
    const api = new PalisadeApi(clientOn(read), clientOn(write))

    await api.call('BalanceService_GetWalletBalances', {
      path: { vaultId: 'v1', walletId: 'w1' },
    })

    expect(write.requests).toHaveLength(0)
    expect(read.requests).toHaveLength(1)
    expect(read.requests[0].method).toBe('GET')
    expect(read.requests[0].url).toBe(
      `${BASE_URL}/v2/vaults/v1/wallets/w1/balances`,
    )
  })

  it('appends query params on a GET', async () => {
    const read = recordingPort({ wallets: [] })
    const api = new PalisadeApi(clientOn(read), clientOn(recordingPort()))

    await api.call('VaultService_ListGlobalWallets', {
      query: { blockchain: 'XRP_LEDGER', pageSize: 50 },
    })

    expect(read.requests[0].url).toContain('blockchain=XRP_LEDGER')
    expect(read.requests[0].url).toContain('pageSize=50')
  })

  it('routes a mutation to the transactions client with a JSON body', async () => {
    const read = recordingPort()
    const write = recordingPort({ id: 'cp1' })
    const api = new PalisadeApi(clientOn(read), clientOn(write))

    const body = { name: 'Acme', details: { type: 'ORGANIZATION' as const } }
    await api.call('CounterpartyService_CreateCounterparty', { body })

    expect(read.requests).toHaveLength(0)
    expect(write.requests).toHaveLength(1)
    expect(write.requests[0].method).toBe('POST')
    expect(write.requests[0].url).toBe(`${BASE_URL}/v2/counterparties`)
    expect(JSON.parse(write.requests[0].body ?? '{}')).toEqual(body)
  })

  it('routes by scope to a registered client, overriding the method fallback', async () => {
    const read = recordingPort({ limits: [] })
    const write = recordingPort()
    const policy = recordingPort({ limits: [] })
    const api = new PalisadeApi(clientOn(read), clientOn(write), {
      Policies: clientOn(policy),
    })

    // A GET would fall back to the read client under method-based routing (a);
    // the registered `Policies` client wins under tag-based routing (b).
    await api.call('PolicyService_ListGlobalWalletLimits')

    expect(read.requests).toHaveLength(0)
    expect(write.requests).toHaveLength(0)
    expect(policy.requests).toHaveLength(1)
    expect(policy.requests[0].url).toBe(`${BASE_URL}/v2/policy-rules/limits`)
  })

  it('falls back to method-based routing for scopes with no registered client', async () => {
    const read = recordingPort({ limits: [] })
    const api = new PalisadeApi(clientOn(read), clientOn(recordingPort()), {
      Webhooks: clientOn(recordingPort()),
    })

    // No `Policies` client registered → the GET falls back to the read client.
    await api.call('PolicyService_ListGlobalWalletLimits')

    expect(read.requests).toHaveLength(1)
  })

  it('throws when a required path parameter is missing', async () => {
    const api = new PalisadeApi(
      clientOn(recordingPort()),
      clientOn(recordingPort()),
    )

    await expect(
      // @ts-expect-error -- incomplete path, to exercise the runtime guard
      api.call('BalanceService_GetWalletBalances', { path: { vaultId: 'v1' } }),
    ).rejects.toThrow(/Missing path parameter 'walletId'/u)
  })
})
