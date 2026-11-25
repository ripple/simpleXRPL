import type { Payment } from 'xrpl'

import { CustodyApi } from '../../../src/custodians/ripple/api.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import type { RippleCustodyState } from '../../../src/custodians/ripple/construction.js'
import type { CustodyAddressReference } from '../../../src/custodians/ripple/discovery/address-lookup.js'
import type { CustodyQuarantineAccount } from '../../../src/custodians/ripple/intent-types.js'
import {
  autoReleaseQuarantined,
  listQuarantinedTransfers,
  proposeQuarantineRelease,
  resolveQuarantineAccountId,
  runAutoRelease,
} from '../../../src/custodians/ripple/submission/quarantine-release.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import { pinnedCapabilities } from '../../../src/custodians/ripple/versioning/capabilities.js'
import { VersionGuard } from '../../../src/custodians/ripple/versioning/version-guard.js'
import type { SubmissionContext } from '../../../src/domain/index.js'
import {
  AccountNotFoundError,
  CustodyApiError,
  SimpleXRPLError,
  UnsupportedInVersionError,
} from '../../../src/errors.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'
import { FakeHttpPort, ok, status } from '../custody-discovery/test-utils.js'

const KEY = generateTestKey('ed25519')
const GATEWAY = 'https://custody.example.com'
const DOMAIN = 'domain-1'

/** A quarantined transfer's wire shape, trimmed to the fields the code reads. */
interface TransferFixture {
  readonly id: string
  readonly quarantined?: boolean
  readonly quarantineStatus?: 'Quarantined' | 'Released' | 'Skipped' | null
  readonly recipient?: { type: string; accountId?: string }
  readonly senders?: ReadonlyArray<{ type: string; accountId?: string }>
}

/**
 * Build a quarantined fixture transfer whose recipient is a custodied account.
 *
 * @param id - The transfer id.
 * @param accountId - The recipient's custodied account id.
 * @returns The fixture transfer.
 */
function toAccount(id: string, accountId: string): TransferFixture {
  return {
    id,
    quarantineStatus: 'Quarantined',
    recipient: { type: 'Account', accountId },
    senders: [],
  }
}

/**
 * A `CustodyApi` + client over a transport the handler answers, recording every
 * request. The auth port is separate, so `http.requests` holds API calls only.
 *
 * @param handler - Chooses the response for each request.
 * @returns The api, its client, and the recording port.
 */
function apiOn(handler: (request: HttpRequest) => HttpResponse): {
  api: CustodyApi
  client: CustodyHttpClient
  http: FakeHttpPort
} {
  const http = new FakeHttpPort(handler)
  const auth = new CustodyAuthService({
    authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
    privateKey: KEY,
  })
  const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })
  const api = new CustodyApi(client, {
    intentSigner: IntentSigner.fromPrivateKey(KEY),
    domainId: DOMAIN,
    authorUserId: 'user-1',
  })
  return { api, client, http }
}

/**
 * A `CustodyApi` + client whose transport answers transfer reads with `transfers`
 * and records every request. The GET returns the transfers collection; the POST
 * (`propose`) returns an acknowledgement.
 *
 * @param transfers - The transfers every `getTransfers` read returns.
 * @param nextStartingAfter - The pagination cursor to echo on the read (Custody
 *   returns a literal `null` on the last page).
 * @returns The api, its client, and the recording port.
 */
function harness(
  transfers: readonly TransferFixture[],
  nextStartingAfter?: string | null,
): {
  api: CustodyApi
  client: CustodyHttpClient
  http: FakeHttpPort
} {
  return apiOn((request) => {
    if (request.method === 'GET') {
      return ok({
        items: transfers,
        count: transfers.length,
        nextStartingAfter,
      })
    }
    return ok({ requestId: 'req-1' })
  })
}

/**
 * The account + transfer ids of every release proposed via a recorded POST.
 *
 * @param http - The recording port.
 * @returns One `{ accountId, transferIds }` per proposed release.
 */
function releasePayloads(
  http: FakeHttpPort,
): Array<{ accountId: string; transferIds: string[] }> {
  return http.requests
    .filter((request) => request.method === 'POST')
    .map((request) => {
      const body = JSON.parse(request.body ?? '{}') as {
        request: { payload: { accountId: string; transferIds: string[] } }
      }
      const { accountId, transferIds } = body.request.payload
      return { accountId, transferIds }
    })
}

describe('autoReleaseQuarantined', () => {
  it('proposes a release per account, batching that account’s transfers', async () => {
    const { api, client, http } = harness([
      toAccount('tr1', 'acc-A'),
      toAccount('tr2', 'acc-A'),
      toAccount('tr3', 'acc-B'),
    ])

    const ids = await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 50,
    })

    expect(ids).toHaveLength(2)
    const payloads = releasePayloads(http)
    expect(payloads).toContainEqual({
      accountId: 'acc-A',
      transferIds: ['tr1', 'tr2'],
    })
    expect(payloads).toContainEqual({
      accountId: 'acc-B',
      transferIds: ['tr3'],
    })
  })

  it('stops paginating when Custody signals the last page with a null cursor', async () => {
    // Custody returns a literal `null` for nextStartingAfter on the final page;
    // the loop must treat that as the end rather than looping forever.
    const { api, client } = harness([toAccount('tr1', 'acc-A')], null)

    const ids = await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 50,
    })

    expect(ids).toHaveLength(1)
  })

  it('proposes nothing when every transfer was skipped', async () => {
    const { api, client, http } = harness([
      {
        id: 'tr1',
        quarantineStatus: 'Skipped',
        recipient: { type: 'Account', accountId: 'acc-A' },
      },
    ])

    const ids = await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 50,
    })

    expect(ids).toEqual([])
    expect(releasePayloads(http)).toHaveLength(0)
  })

  it('releases under the sender when the recipient is external', async () => {
    const { api, client, http } = harness([
      {
        id: 'tr1',
        quarantineStatus: 'Quarantined',
        recipient: { type: 'Address' },
        senders: [{ type: 'Account', accountId: 'acc-sender' }],
      },
    ])

    await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 50,
    })

    expect(releasePayloads(http)).toEqual([
      { accountId: 'acc-sender', transferIds: ['tr1'] },
    ])
  })

  it('skips transfers with no custodied party (nothing to release under)', async () => {
    const { api, client, http } = harness([
      {
        id: 'tr1',
        quarantineStatus: 'Quarantined',
        recipient: { type: 'Address' },
        senders: [{ type: 'Address' }],
      },
    ])

    const ids = await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 50,
    })

    expect(ids).toEqual([])
    expect(releasePayloads(http)).toHaveLength(0)
  })

  it('does not wait on a transfer Custody gave a null status', async () => {
    // Custody sends `quarantineStatus: null` for a transfer quarantine doesn't
    // apply to, such as the transaction's fee, and never changes it. Were that
    // read as "still pending", every auto-release would poll to its timeout —
    // here, long enough to fail the test.
    const { api, client, http } = harness([
      toAccount('tr1', 'acc-A'),
      {
        id: 'fee',
        quarantineStatus: null,
        senders: [{ type: 'Account', accountId: 'acc-sender' }],
      },
    ])

    const ids = await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 60_000,
    })

    expect(ids).toHaveLength(1)
    expect(
      http.requests.filter((request) => request.method === 'GET'),
    ).toHaveLength(1)
    expect(releasePayloads(http)).toEqual([
      { accountId: 'acc-A', transferIds: ['tr1'] },
    ])
  })

  it('on timeout, releases only what is already quarantined', async () => {
    // One decided (Quarantined) + one with no status at all → not all decided,
    // so the short timeout returns the quarantined one best-effort.
    const { api, client, http } = harness([
      toAccount('tr1', 'acc-A'),
      { id: 'tr2', recipient: { type: 'Account', accountId: 'acc-A' } },
    ])

    const ids = await autoReleaseQuarantined({
      client,
      api,
      domainId: DOMAIN,
      transactionId: 'tx-1',
      timeoutMs: 1,
    })

    expect(ids).toHaveLength(1)
    expect(releasePayloads(http)).toEqual([
      { accountId: 'acc-A', transferIds: ['tr1'] },
    ])
  })
})

const PAYMENT: Payment = {
  TransactionType: 'Payment',
  Account: 'rFrom',
  Destination: 'rTo',
  Amount: '1',
}

/**
 * A partial state carrying only what {@link runAutoRelease} reads.
 *
 * @param client - The authenticated Custody client.
 * @param autoReleaseQuarantine - The configured default for the feature.
 * @returns The state stub.
 */
function stateFor(
  client: CustodyHttpClient,
  autoReleaseQuarantine: boolean,
): RippleCustodyState {
  return {
    client,
    domainId: DOMAIN,
    autoReleaseQuarantine,
    quarantinePollTimeoutMs: 50,
  } as RippleCustodyState
}

const NO_OVERRIDE = {} as SubmissionContext

describe('runAutoRelease gating', () => {
  it('is a no-op when disabled', async () => {
    const { api, client, http } = harness([toAccount('tr1', 'acc-A')])

    const ids = await runAutoRelease({
      state: stateFor(client, false),
      api,
      tx: PAYMENT,
      ctx: NO_OVERRIDE,
      transactionId: 'tx-1',
    })

    expect(ids).toBeUndefined()
    expect(http.requests).toHaveLength(0)
  })

  it('is a no-op for a non-token-movement transactor', async () => {
    const { api, client, http } = harness([toAccount('tr1', 'acc-A')])

    const ids = await runAutoRelease({
      state: stateFor(client, true),
      api,
      tx: { TransactionType: 'AccountSet', Account: 'rFrom' },
      ctx: NO_OVERRIDE,
      transactionId: 'tx-1',
    })

    expect(ids).toBeUndefined()
    expect(http.requests).toHaveLength(0)
  })

  it('is a no-op when there is no Custody transaction id', async () => {
    const { api, client } = harness([toAccount('tr1', 'acc-A')])

    const ids = await runAutoRelease({
      state: stateFor(client, true),
      api,
      tx: PAYMENT,
      ctx: NO_OVERRIDE,
      transactionId: undefined,
    })

    expect(ids).toBeUndefined()
  })

  it('runs when enabled, a Payment, and a transaction id is present', async () => {
    const { api, client } = harness([toAccount('tr1', 'acc-A')])

    const ids = await runAutoRelease({
      state: stateFor(client, true),
      api,
      tx: PAYMENT,
      ctx: NO_OVERRIDE,
      transactionId: 'tx-1',
    })

    expect(ids).toHaveLength(1)
  })

  it('the per-call override turns it on over a disabled default', async () => {
    const { api, client } = harness([toAccount('tr1', 'acc-A')])

    const ids = await runAutoRelease({
      state: stateFor(client, false),
      api,
      tx: PAYMENT,

      ctx: { autoReleaseQuarantine: true } as SubmissionContext,
      transactionId: 'tx-1',
    })

    expect(ids).toHaveLength(1)
  })

  it('swallows a detection failure rather than failing the submission', async () => {
    const { api, client } = apiOn(() => status(500))

    const ids = await runAutoRelease({
      state: stateFor(client, true),
      api,
      tx: PAYMENT,
      ctx: NO_OVERRIDE,
      transactionId: 'tx-1',
    })

    expect(ids).toBeUndefined()
  })
})

describe('proposeQuarantineRelease', () => {
  it('proposes a release for the given transfers and returns the intent id', async () => {
    const { api, http } = harness([])

    const intentId = await proposeQuarantineRelease(api, {
      accountId: 'acc-A',
      transferIds: ['tr1', 'tr2'],
    })

    expect(intentId).toBeTruthy()
    expect(releasePayloads(http)).toEqual([
      { accountId: 'acc-A', transferIds: ['tr1', 'tr2'] },
    ])
  })
})

/**
 * The query parameters each recorded request carried.
 *
 * @param http - The recording port.
 * @returns One `URLSearchParams` per request, in order.
 */
function queries(http: FakeHttpPort): URLSearchParams[] {
  return http.requests.map((request) => new URL(request.url).searchParams)
}

/**
 * A transfers page.
 *
 * @param items - The transfers on the page.
 * @param nextStartingAfter - The cursor to the next page (`null` on the last).
 * @returns The response.
 */
function transfersPage(
  items: readonly TransferFixture[],
  nextStartingAfter: string | null = null,
): HttpResponse {
  return ok({ items, count: items.length, nextStartingAfter })
}

describe('listQuarantinedTransfers', () => {
  it('reads the account’s transfers filtered on the Quarantined status', async () => {
    const { api, http } = apiOn(() =>
      transfersPage([toAccount('tr1', 'acc-A'), toAccount('tr2', 'acc-A')]),
    )

    const transfers = await listQuarantinedTransfers(api, DOMAIN, 'acc-A')

    expect(transfers.map((transfer) => transfer.id)).toEqual(['tr1', 'tr2'])
    expect(http.requests).toHaveLength(1)
    expect(http.requests[0].url).toContain(
      `/v1/domains/${DOMAIN}/transactions/transfers?`,
    )
    const [query] = queries(http)
    expect(query.get('accountId')).toBe('acc-A')
    expect(query.get('quarantineStatus')).toBe('Quarantined')
    expect(query.has('quarantined')).toBe(false)
  })

  it('falls back to the quarantined boolean when the status filter returns a 500', async () => {
    const { api, http } = apiOn((request) => {
      if (new URL(request.url).searchParams.has('quarantineStatus')) {
        return status(500)
      }
      // An instance that fails the filter may not report the status either.
      return transfersPage([
        {
          id: 'tr1',
          quarantined: true,
          quarantineStatus: null,
          recipient: { type: 'Account', accountId: 'acc-A' },
          senders: [],
        },
      ])
    })

    const transfers = await listQuarantinedTransfers(api, DOMAIN, 'acc-A')

    expect(transfers.map((transfer) => transfer.id)).toEqual(['tr1'])
    expect(http.requests).toHaveLength(2)
    const fallback = queries(http)[1]
    expect(fallback.get('accountId')).toBe('acc-A')
    expect(fallback.get('quarantined')).toBe('true')
    expect(fallback.has('quarantineStatus')).toBe(false)
  })

  it('surfaces a failure that is not a 500 without retrying', async () => {
    const { api, http } = apiOn(() => status(403))

    const listing = listQuarantinedTransfers(api, DOMAIN, 'acc-A')

    await expect(listing).rejects.toBeInstanceOf(CustodyApiError)
    await expect(listing).rejects.toMatchObject({ status: 403 })
    expect(http.requests).toHaveLength(1)
  })

  it('surfaces the 500 when the fallback fails too', async () => {
    const { api, http } = apiOn(() => status(500))

    await expect(
      listQuarantinedTransfers(api, DOMAIN, 'acc-A'),
    ).rejects.toMatchObject({ status: 500 })
    expect(http.requests).toHaveLength(2)
  })

  it('keeps only the transfers the account received', async () => {
    // The `accountId` filter also matches transfers the account sent; those
    // are released under the account that received them.
    const { api } = apiOn(() =>
      transfersPage([
        toAccount('incoming', 'acc-A'),
        {
          id: 'outgoing',
          quarantineStatus: 'Quarantined',
          recipient: { type: 'Account', accountId: 'acc-B' },
          senders: [{ type: 'Account', accountId: 'acc-A' }],
        },
      ]),
    )

    const transfers = await listQuarantinedTransfers(api, DOMAIN, 'acc-A')

    expect(transfers.map((transfer) => transfer.id)).toEqual(['incoming'])
  })

  it('drops a row that is not quarantined, whatever the filter returned', async () => {
    const { api } = apiOn(() =>
      transfersPage([
        toAccount('held', 'acc-A'),
        {
          id: 'released',
          quarantined: false,
          quarantineStatus: 'Released',
          recipient: { type: 'Account', accountId: 'acc-A' },
          senders: [],
        },
      ]),
    )

    const transfers = await listQuarantinedTransfers(api, DOMAIN, 'acc-A')

    expect(transfers.map((transfer) => transfer.id)).toEqual(['held'])
  })

  it('follows the cursor across pages', async () => {
    const { api, http } = apiOn((request) => {
      const cursor = new URL(request.url).searchParams.get('startingAfter')
      return cursor === 'tr1'
        ? transfersPage([toAccount('tr2', 'acc-A')])
        : transfersPage([toAccount('tr1', 'acc-A')], 'tr1')
    })

    const transfers = await listQuarantinedTransfers(api, DOMAIN, 'acc-A')

    expect(transfers.map((transfer) => transfer.id)).toEqual(['tr1', 'tr2'])
    expect(http.requests).toHaveLength(2)
  })
})

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
    accountId: 'acc-A',
    createdAt: '2026-01-01T00:00:00Z',
    custodyType: 'SubCustody',
    ...overrides,
  }
}

/**
 * The custodian state an account lookup reads, over a faked transport.
 *
 * @param handler - Chooses the response for each request.
 * @param versionGuard - The version guard; omitted, nothing is blocked.
 * @returns The state stub and the recording port.
 */
function lookupState(
  handler: (request: HttpRequest) => HttpResponse,
  versionGuard = new VersionGuard(undefined),
): {
  state: Pick<RippleCustodyState, 'client' | 'domainId' | 'versionGuard'>
  http: FakeHttpPort
} {
  const { client, http } = apiOn(handler)
  return { state: { client, domainId: DOMAIN, versionGuard }, http }
}

const SDK_METHOD = 'listQuarantinedTransfers'

describe('resolveQuarantineAccountId', () => {
  it('returns a given Custody account id without a lookup', async () => {
    const { state, http } = lookupState(() => status(500))

    await expect(
      resolveQuarantineAccountId(state, { accountId: 'acc-A' }, SDK_METHOD),
    ).resolves.toBe('acc-A')
    expect(http.requests).toHaveLength(0)
  })

  it('looks an XRPL address up in the custodian’s own domain', async () => {
    const { state, http } = lookupState(() =>
      ok({
        items: [
          addressRef({ id: 'elsewhere', domainId: 'domain-2', accountId: 'x' }),
          addressRef(),
        ],
        count: 2,
      }),
    )

    await expect(
      resolveQuarantineAccountId(state, { account: 'rHolder' }, SDK_METHOD),
    ).resolves.toBe('acc-A')
    expect(http.requests[0].url).toBe(`${GATEWAY}/v1/addresses?address=rHolder`)
  })

  it('resolves an account that holds the address on several ledgers', async () => {
    // One Custody account, the same address on testnet and mainnet: still one
    // account, so there is nothing to disambiguate.
    const { state } = lookupState(() =>
      ok({
        items: [addressRef(), addressRef({ id: 'main', ledgerId: 'xrpl' })],
        count: 2,
      }),
    )

    await expect(
      resolveQuarantineAccountId(state, { account: 'rHolder' }, SDK_METHOD),
    ).resolves.toBe('acc-A')
  })

  it('throws when several accounts in the domain hold the address', async () => {
    const { state } = lookupState(() =>
      ok({
        items: [addressRef(), addressRef({ id: 'b', accountId: 'acc-B' })],
        count: 2,
      }),
    )

    await expect(
      resolveQuarantineAccountId(state, { account: 'rHolder' }, SDK_METHOD),
    ).rejects.toThrow(
      `2 Custody accounts in domain ${DOMAIN} hold rHolder (acc-A, acc-B); name one by accountId`,
    )
  })

  it('throws AccountNotFoundError when no account in the domain holds the address', async () => {
    const { state } = lookupState(() =>
      ok({ items: [addressRef({ domainId: 'domain-2' })], count: 1 }),
    )

    await expect(
      resolveQuarantineAccountId(state, { account: 'rHolder' }, SDK_METHOD),
    ).rejects.toBeInstanceOf(AccountNotFoundError)
  })

  it('names the calling method when the version cannot look an address up', async () => {
    const { state, http } = lookupState(
      () => status(500),
      new VersionGuard(pinnedCapabilities('1.15')),
    )

    await expect(
      resolveQuarantineAccountId(state, { account: 'rHolder' }, SDK_METHOD),
    ).rejects.toMatchObject({
      constructor: UnsupportedInVersionError,
      sdkMethod: SDK_METHOD,
    })
    expect(http.requests).toHaveLength(0)
  })

  it.each([
    ['neither', {}],
    ['both', { account: 'rHolder', accountId: 'acc-A' }],
  ])('rejects %s of account and accountId', async (_name, selector) => {
    const { state, http } = lookupState(() => status(500))

    const resolving = resolveQuarantineAccountId(
      state,
      // An untyped caller can still get the shape wrong.
      selector as CustodyQuarantineAccount,
      SDK_METHOD,
    )

    await expect(resolving).rejects.toBeInstanceOf(SimpleXRPLError)
    await expect(resolving).rejects.toThrow(/exactly one way/u)
    expect(http.requests).toHaveLength(0)
  })
})
