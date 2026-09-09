import type { Payment } from 'xrpl'

import { CustodyApi } from '../../../src/custodians/ripple/api.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import type { RippleCustodyState } from '../../../src/custodians/ripple/construction.js'
import {
  autoReleaseQuarantined,
  proposeQuarantineRelease,
  runAutoRelease,
} from '../../../src/custodians/ripple/submission/quarantine-release.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type { HttpRequest } from '../../../src/custodians/ripple/transport/http-port.js'
import type { SubmissionContext } from '../../../src/domain/index.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'
import { FakeHttpPort, ok } from '../custody-discovery/test-utils.js'

const KEY = generateTestKey('ed25519')
const GATEWAY = 'https://custody.example.com'
const DOMAIN = 'domain-1'

/** A quarantined transfer's wire shape, trimmed to the fields the code reads. */
interface TransferFixture {
  readonly id: string
  readonly quarantineStatus?: 'Quarantined' | 'Released' | 'Skipped'
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
 * A `CustodyApi` + client whose transport answers transfer reads with `transfers`
 * and records every request. The GET returns the transfers collection; the POST
 * (`propose`) returns an acknowledgement.
 *
 * @param transfers - The transfers every `getTransfers` read returns.
 * @param nextStartingAfter - The pagination cursor to echo on the read (Custody
 *   returns a literal `null` on the last page).
 * @returns The api, client, and recording port.
 */
function harness(
  transfers: readonly TransferFixture[],
  nextStartingAfter?: string | null,
): {
  api: CustodyApi
  client: CustodyHttpClient
  http: FakeHttpPort
} {
  const http = new FakeHttpPort((request: HttpRequest) => {
    if (request.method === 'GET') {
      return ok({
        items: transfers,
        count: transfers.length,
        nextStartingAfter,
      })
    }
    return ok({ requestId: 'req-1' })
  })
  const auth = new CustodyAuthService({
    authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
    privateKey: KEY,
  })
  const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })
  const intentSigner = new IntentSigner(KeypairService.fromPrivateKey(KEY), KEY)
  const api = new CustodyApi(client, {
    intentSigner,
    domainId: DOMAIN,
    authorUserId: 'user-1',
  })
  return { api, client, http }
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

  it('on timeout, releases only what is already quarantined', async () => {
    // One decided (Quarantined) + one still pending → not all decided, so the
    // short timeout returns the quarantined one best-effort.
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
    const http = new FakeHttpPort(() => ({ status: 500, body: '{}' }))
    const auth = new CustodyAuthService({
      authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
      privateKey: KEY,
    })
    const client = new CustodyHttpClient({ gatewayUrl: GATEWAY, http, auth })
    const intentSigner = new IntentSigner(
      KeypairService.fromPrivateKey(KEY),
      KEY,
    )
    const api = new CustodyApi(client, {
      intentSigner,
      domainId: DOMAIN,
      authorUserId: 'user-1',
    })

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
