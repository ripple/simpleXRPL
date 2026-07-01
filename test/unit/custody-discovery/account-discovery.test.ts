import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { discoverXrplAccounts } from '../../../src/custodians/ripple/discovery/account-discovery.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'

import {
  FakeHttpPort,
  accountsBody,
  addressesBody,
  ledgersBody,
  ok,
} from './test-utils.js'

const KEY = generateTestKey('ed25519')
const DOMAIN = 'dom-1'

function makeClient(
  handler: (request: HttpRequest) => HttpResponse,
): CustodyHttpClient {
  const auth = new CustodyAuthService({
    authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
    privateKey: KEY,
  })
  return new CustodyHttpClient({
    gatewayUrl: 'https://custody.example.com',
    http: new FakeHttpPort(handler),
    auth,
  })
}

describe('discoverXrplAccounts', () => {
  it('keeps only XRPL-ledger accounts and their external addresses', async () => {
    const client = makeClient((request) => {
      const { url } = request
      if (url.includes('/v1/ledgers')) {
        return ok(
          ledgersBody([
            { id: 'xrpl-1', type: 'XRPL' },
            { id: 'eth-1', type: 'Ethereum' },
          ]),
        )
      }
      if (url.includes('/addresses')) {
        return ok(
          addressesBody([
            {
              address: 'rTreasury',
              scope: 'External',
              ledgerId: 'xrpl-1',
              accountId: 'acc-1',
            },
            {
              address: 'rInternalChange',
              scope: 'Internal',
              ledgerId: 'xrpl-1',
              accountId: 'acc-1',
            },
          ]),
        )
      }
      // /accounts
      return ok(
        accountsBody([
          { id: 'acc-1', alias: 'treasury', ledgerId: 'xrpl-1' },
          { id: 'acc-2', alias: 'eth-ops', ledgerId: 'eth-1' },
        ]),
      )
    })

    const accounts = await discoverXrplAccounts(client, DOMAIN)

    expect(accounts).toEqual([
      { address: 'rTreasury', alias: 'treasury', custodianRef: 'acc-1' },
    ])
  })

  it('walks every page of the accounts collection (cursor pagination)', async () => {
    const client = makeClient((request) => {
      const { url } = request
      if (url.includes('/v1/ledgers')) {
        return ok(ledgersBody([{ id: 'xrpl-1', type: 'XRPL' }]))
      }
      if (url.includes('/addresses')) {
        const accountId = url.includes('acc-1') ? 'acc-1' : 'acc-2'
        const address = accountId === 'acc-1' ? 'rOne' : 'rTwo'
        return ok(
          addressesBody([
            { address, scope: 'External', ledgerId: 'xrpl-1', accountId },
          ]),
        )
      }
      // /accounts — first page carries a cursor, second page closes it out.
      if (url.includes('startingAfter=')) {
        return ok(accountsBody([{ id: 'acc-2', ledgerId: 'xrpl-1' }]))
      }
      return ok(accountsBody([{ id: 'acc-1', ledgerId: 'xrpl-1' }], 'cursor-2'))
    })

    const accounts = await discoverXrplAccounts(client, DOMAIN)

    expect(accounts.map((account) => account.address)).toEqual(['rOne', 'rTwo'])
  })

  it('returns an empty list for a domain with no accounts', async () => {
    const client = makeClient((request) => {
      if (request.url.includes('/v1/ledgers')) {
        return ok(ledgersBody([{ id: 'xrpl-1', type: 'XRPL' }]))
      }
      return ok(accountsBody([]))
    })

    await expect(discoverXrplAccounts(client, DOMAIN)).resolves.toEqual([])
  })

  it('contributes nothing for an XRPL account with no external address', async () => {
    const client = makeClient((request) => {
      const { url } = request
      if (url.includes('/v1/ledgers')) {
        return ok(ledgersBody([{ id: 'xrpl-1', type: 'XRPL' }]))
      }
      if (url.includes('/addresses')) {
        // Only an Internal (change) address — no external address to register.
        return ok(
          addressesBody([
            {
              address: 'rChange',
              scope: 'Internal',
              ledgerId: 'xrpl-1',
              accountId: 'acc-1',
            },
          ]),
        )
      }
      return ok(accountsBody([{ id: 'acc-1', ledgerId: 'xrpl-1' }]))
    })

    await expect(discoverXrplAccounts(client, DOMAIN)).resolves.toEqual([])
  })

  it('yields one Account per external address when an account has several', async () => {
    const client = makeClient((request) => {
      const { url } = request
      if (url.includes('/v1/ledgers')) {
        return ok(ledgersBody([{ id: 'xrpl-1', type: 'XRPL' }]))
      }
      if (url.includes('/addresses')) {
        return ok(
          addressesBody([
            {
              address: 'rA',
              scope: 'External',
              ledgerId: 'xrpl-1',
              accountId: 'acc-1',
            },
            {
              address: 'rB',
              scope: 'External',
              ledgerId: 'xrpl-1',
              accountId: 'acc-1',
            },
          ]),
        )
      }
      return ok(
        accountsBody([{ id: 'acc-1', alias: 'multi', ledgerId: 'xrpl-1' }]),
      )
    })

    const accounts = await discoverXrplAccounts(client, DOMAIN)

    expect(accounts).toEqual([
      { address: 'rA', alias: 'multi', custodianRef: 'acc-1' },
      { address: 'rB', alias: 'multi', custodianRef: 'acc-1' },
    ])
  })
})
