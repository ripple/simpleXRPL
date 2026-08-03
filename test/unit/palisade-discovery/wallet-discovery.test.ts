import { PalisadeAuthService } from '../../../src/custodians/palisade/auth/palisade-auth.service.js'
import { discoverXrplWallets } from '../../../src/custodians/palisade/discovery/wallet-discovery.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/palisade/transport/http-port.js'
import { PalisadeHttpClient } from '../../../src/custodians/palisade/transport/palisade-http-client.js'
import { FakeAuthPort } from '../palisade-auth/test-utils.js'

import { FakeHttpPort, makeFakeSigner, ok, walletsBody } from './test-utils.js'

const ONE_HOUR_S = 3600
const SIGNER = makeFakeSigner()

function makeClient(
  handler: (request: HttpRequest) => HttpResponse,
): PalisadeHttpClient {
  const auth = new PalisadeAuthService({
    authPort: new FakeAuthPort({ accessToken: 'jwt-1', expiresIn: ONE_HOUR_S }),
    clientId: 'client-1',
    clientSecret: 'secret-1',
  })
  return new PalisadeHttpClient({
    baseUrl: 'https://api.palisade.co',
    http: new FakeHttpPort(handler),
    auth,
  })
}

describe('discoverXrplWallets', () => {
  it('maps provisioned XRPL wallets to Accounts keyed by r-address', async () => {
    const client = makeClient(() =>
      ok(
        walletsBody([
          {
            id: 'wallet-1',
            vaultId: 'vault-1',
            name: 'treasury',
            address: 'rTreasury',
            status: 'PROVISIONED',
          },
        ]),
      ),
    )

    const accounts = await discoverXrplWallets(client, SIGNER)

    expect(accounts).toEqual([
      {
        address: 'rTreasury',
        alias: 'treasury',
        custodianRef: { vaultId: 'vault-1', walletId: 'wallet-1' },
        signer: SIGNER,
      },
    ])
  })

  it('requests the XRP_LEDGER blockchain filter', async () => {
    let capturedUrl = ''
    const client = makeClient((request) => {
      capturedUrl = request.url
      return ok(walletsBody([]))
    })

    await discoverXrplWallets(client, SIGNER)

    expect(capturedUrl).toContain('blockchain=XRP_LEDGER')
  })

  it('walks every page via the pageToken cursor', async () => {
    const client = makeClient((request) => {
      if (request.url.includes('pageToken=')) {
        return ok(walletsBody([{ id: 'w2', vaultId: 'v2', address: 'rTwo' }]))
      }
      return ok(
        walletsBody([{ id: 'w1', vaultId: 'v1', address: 'rOne' }], 'cursor-2'),
      )
    })

    const accounts = await discoverXrplWallets(client, SIGNER)

    expect(accounts.map((account) => account.address)).toEqual(['rOne', 'rTwo'])
  })

  it('excludes wallets that are not fully provisioned', async () => {
    const client = makeClient(() =>
      ok(
        walletsBody([
          { id: 'w1', vaultId: 'v1', address: 'rReady', status: 'PROVISIONED' },
          {
            id: 'w2',
            vaultId: 'v1',
            address: 'rPending',
            status: 'PROVISIONING',
          },
        ]),
      ),
    )

    const accounts = await discoverXrplWallets(client, SIGNER)

    expect(accounts.map((account) => account.address)).toEqual(['rReady'])
  })

  it('excludes a provisioned wallet with no resolved address', async () => {
    // The wallet spec below omits `address` entirely.
    const client = makeClient(() =>
      ok(walletsBody([{ id: 'w1', vaultId: 'v1', status: 'PROVISIONED' }])),
    )

    await expect(discoverXrplWallets(client, SIGNER)).resolves.toEqual([])
  })

  it('returns an empty list when the organization has no XRPL wallets', async () => {
    const client = makeClient(() => ok(walletsBody([])))

    await expect(discoverXrplWallets(client, SIGNER)).resolves.toEqual([])
  })
})
