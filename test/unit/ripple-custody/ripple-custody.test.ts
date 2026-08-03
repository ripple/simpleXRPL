import { Wallet } from 'xrpl'
import type { OfferCancel, Payment } from 'xrpl'

import { RippleCustody } from '../../../src/custodians/ripple/ripple-custody.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import type { SubmissionContext } from '../../../src/domain/index.js'
import {
  AccountNotFoundError,
  CustodyAuthError,
  IntentPendingError,
  IntentValidationError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../../src/errors.js'
import { makeJwt } from '../custody-auth/test-utils.js'
import {
  accountsBody,
  addressesBody,
  ledgersBody,
} from '../custody-discovery/test-utils.js'

import {
  AUTHOR_USER_ID,
  DOMAIN_ID,
  FakeHttpPort,
  SIGNING_KEY,
  apiAccountBody,
  apiManifestBody,
  fakeLedger,
  intentBody,
  meBody,
  ok,
} from './test-utils.js'

const PRIMARY_ADDRESS = Wallet.generate().classicAddress
const ACCOUNT_ID = 'acc-1'
const TAKER = Wallet.generate().classicAddress

/** Wire-level endpoint responders; a test overrides just the ones it cares about. */
interface Routes {
  me?: () => HttpResponse
  accounts?: () => HttpResponse
  account?: () => HttpResponse
  intentCreate?: (body: unknown) => HttpResponse
  intentGet?: () => HttpResponse
  manifestGet?: () => HttpResponse
  dryRun?: (body: unknown) => HttpResponse
}

/** One routing rule: matches a request, then produces its response. */
interface Route {
  readonly test: (request: HttpRequest) => boolean
  readonly respond: (request: HttpRequest) => HttpResponse
}

/**
 * Build the ordered routing table for one set of endpoint overrides. Kept as
 * a table (rather than an if/else chain) so each endpoint's match + default
 * response stays a single, independently readable entry.
 *
 * @param routes - Per-endpoint overrides.
 * @returns The ordered routes; the first match wins.
 */
function buildRoutes(routes: Routes): Route[] {
  return [
    {
      test: (request): boolean => request.url.includes('auth.example.com'),
      respond: (): HttpResponse =>
        ok({ access_token: makeJwt({ exp: 9_999_999_999 }) }),
    },
    {
      test: (request): boolean => request.url.endsWith('/v1/me'),
      respond: (): HttpResponse =>
        (
          routes.me ??
          ((): HttpResponse => ok(meBody(DOMAIN_ID, AUTHOR_USER_ID)))
        )(),
    },
    {
      test: (request): boolean => request.url.includes('/v1/ledgers'),
      respond: (): HttpResponse =>
        ok(ledgersBody([{ id: 'xrpl-1', type: 'XRPL' }])),
    },
    {
      test: (request): boolean => request.url.includes('/intents/dry-run'),
      respond: (request): HttpResponse =>
        (
          routes.dryRun ??
          ((): HttpResponse =>
            ok({ success: true, type: 'v0_CreateTransactionOrder' }))
        )(JSON.parse(request.body ?? '{}')),
    },
    {
      test: (request): boolean =>
        request.method === 'POST' && request.url.endsWith('/v1/intents'),
      respond: (request): HttpResponse =>
        (
          routes.intentCreate ??
          ((): HttpResponse => ok({ requestId: 'req-1' }))
        )(JSON.parse(request.body ?? '{}')),
    },
    {
      test: (request): boolean =>
        request.url.includes('/intents/') &&
        !request.url.includes('/intents/dry-run'),
      respond: (): HttpResponse =>
        (
          routes.intentGet ??
          ((): HttpResponse => ok(intentBody('intent-1', 'Executed')))
        )(),
    },
    {
      test: (request): boolean => request.url.includes('/manifests/'),
      respond: (): HttpResponse =>
        (
          routes.manifestGet ??
          ((): HttpResponse =>
            ok(
              apiManifestBody(
                'intent-1',
                Buffer.from('sig').toString('base64'),
              ),
            ))
        )(),
    },
    {
      test: (request): boolean => request.url.includes('/addresses'),
      respond: (): HttpResponse =>
        ok(
          addressesBody([
            {
              address: PRIMARY_ADDRESS,
              scope: 'External',
              ledgerId: 'xrpl-1',
              accountId: ACCOUNT_ID,
            },
          ]),
        ),
    },
    {
      test: (request): boolean =>
        request.url.endsWith(`/accounts/${ACCOUNT_ID}`),
      respond: (): HttpResponse =>
        (
          routes.account ??
          ((): HttpResponse =>
            ok(
              apiAccountBody(
                ACCOUNT_ID,
                Buffer.from('EDPUBKEY').toString('base64'),
              ),
            ))
        )(),
    },
    {
      test: (request): boolean => request.url.includes('/accounts'),
      respond: (): HttpResponse =>
        (
          routes.accounts ??
          ((): HttpResponse =>
            ok(accountsBody([{ id: ACCOUNT_ID, ledgerId: 'xrpl-1' }])))
        )(),
    },
  ]
}

/**
 * Build a fake Custody transport covering the full discovery + submission
 * surface `RippleCustody` depends on, with sensible one-account defaults.
 *
 * @param routes - Per-endpoint overrides.
 * @returns The fake port and its recorded requests.
 */
function buildHttp(routes: Routes = {}): FakeHttpPort {
  const table = buildRoutes(routes)
  return new FakeHttpPort((request: HttpRequest) => {
    const route = table.find((entry) => entry.test(request))
    if (route === undefined) {
      throw new Error(`unexpected request: ${request.method} ${request.url}`)
    }
    return route.respond(request)
  })
}

/**
 * Construct a RippleCustody wired to the given routes.
 *
 * @param routes - Per-endpoint overrides.
 * @param options - Construction overrides.
 * @param options.allowRawSigning - Enable the raw-signing fallback.
 * @param options.defaultDryRun - Pre-flight every write through dry-run.
 * @returns The ready custodian and the underlying fake port.
 */
async function makeCustody(
  routes: Routes = {},
  options: { allowRawSigning?: boolean; defaultDryRun?: boolean } = {},
): Promise<{ custody: RippleCustody; http: FakeHttpPort }> {
  const http = buildHttp(routes)
  const custody = await RippleCustody.create({
    gatewayUrl: 'https://custody.example.com',
    auth: {
      signingKey: SIGNING_KEY,
      tokenUrl: 'https://auth.example.com/token',
    },
    domainId: DOMAIN_ID,
    primary: PRIMARY_ADDRESS,
    allowRawSigning: options.allowRawSigning,
    defaultDryRun: options.defaultDryRun,
    http,
  })
  return { custody, http }
}

function makeContext(
  custody: RippleCustody,
  overrides: Partial<SubmissionContext> = {},
): SubmissionContext {
  const ledger = fakeLedger()
  return {
    account: {
      address: PRIMARY_ADDRESS,
      custodianRef: ACCOUNT_ID,
      signer: custody,
    },
    ledger,
    ...overrides,
  }
}

const PAYMENT_TX: Payment = {
  TransactionType: 'Payment',
  Account: PRIMARY_ADDRESS,
  Destination: TAKER,
  Amount: '1000000',
}

const OFFER_CANCEL_TX: OfferCancel = {
  TransactionType: 'OfferCancel',
  Account: PRIMARY_ADDRESS,
  OfferSequence: 1,
}

describe('RippleCustody.create', () => {
  it('resolves the author user id for the configured domain and discovers accounts', async () => {
    const { custody } = await makeCustody()

    expect(custody.primary).toEqual({ address: PRIMARY_ADDRESS })
    await expect(custody.listAccounts()).resolves.toEqual([
      {
        address: PRIMARY_ADDRESS,
        alias: '',
        custodianRef: ACCOUNT_ID,
        ledgerId: 'xrpl-1',
        signer: custody,
      },
    ])
  })

  it('throws CustodyAuthError when the domain is not among /v1/me domains', async () => {
    await expect(
      makeCustody({
        me: () => ok(meBody('some-other-domain', AUTHOR_USER_ID)),
      }),
    ).rejects.toThrow(CustodyAuthError)
  })

  it('throws AccountNotFoundError when the primary was not discovered', async () => {
    const http = buildHttp({
      accounts: () => ok(accountsBody([])),
    })
    await expect(
      RippleCustody.create({
        gatewayUrl: 'https://custody.example.com',
        auth: {
          signingKey: SIGNING_KEY,
          tokenUrl: 'https://auth.example.com/token',
        },
        domainId: DOMAIN_ID,
        primary: PRIMARY_ADDRESS,
        http,
      }),
    ).rejects.toThrow(AccountNotFoundError)
  })
})

describe('RippleCustody.capabilities', () => {
  it('reports the native transactor set and the configured allowRawSigning', async () => {
    const { custody: withoutRaw } = await makeCustody()
    expect(withoutRaw.capabilities().allowRaw).toBe(false)
    expect(withoutRaw.capabilities().nativeOps.has('Payment')).toBe(true)

    const { custody: withRaw } = await makeCustody(
      {},
      { allowRawSigning: true },
    )
    expect(withRaw.capabilities().allowRaw).toBe(true)
  })
})

describe('RippleCustody.sign', () => {
  it('throws SignerCapabilityError for a native transactor', async () => {
    const { custody } = await makeCustody({}, { allowRawSigning: true })
    await expect(
      custody.sign(PAYMENT_TX, makeContext(custody)),
    ).rejects.toThrow(SignerCapabilityError)
  })

  it('throws SignerCapabilityError when raw signing is disabled', async () => {
    const { custody } = await makeCustody()
    await expect(
      custody.sign(OFFER_CANCEL_TX, makeContext(custody)),
    ).rejects.toThrow(SignerCapabilityError)
  })

  it('signs a non-native transactor end to end via the manifest path', async () => {
    const { custody, http } = await makeCustody({}, { allowRawSigning: true })

    const envelope = await custody.sign(OFFER_CANCEL_TX, makeContext(custody))

    expect(envelope.txBlob).toBeTruthy()
    expect(envelope.hash).toBeTruthy()
    const posted = http.requests.find(
      (request) =>
        request.method === 'POST' && request.url.endsWith('/v1/intents'),
    )
    expect(posted).toBeDefined()
    const body = JSON.parse(posted?.body ?? '{}') as {
      request: { payload: { type: string } }
    }
    expect(body.request.payload.type).toBe('v0_SignManifest')
  })

  it('runs a dry-run before the real intent, and skips submission on failure', async () => {
    const { custody, http } = await makeCustody(
      {
        dryRun: () =>
          ok({ success: false, errors: ['nope'], type: 'v0_SignManifest' }),
      },
      { allowRawSigning: true },
    )

    await expect(
      custody.sign(OFFER_CANCEL_TX, makeContext(custody, { dryRun: true })),
    ).rejects.toThrow(IntentValidationError)

    expect(
      http.requests.some(
        (request) =>
          request.method === 'POST' && request.url.endsWith('/v1/intents'),
      ),
    ).toBe(false)
  })
})

describe('RippleCustody.submitAndWait', () => {
  it('submits a native transactor as a governed intent and polls to Executed', async () => {
    const { custody, http } = await makeCustody()

    const result = await custody.submitAndWait(PAYMENT_TX, makeContext(custody))

    expect(result.source).toBe('custody')
    expect(result.intentId).toBeTruthy()
    expect(
      http.requests.some(
        (request) =>
          request.method === 'POST' && request.url.endsWith('/v1/intents'),
      ),
    ).toBe(true)
  })

  it('throws IntentValidationError when the native intent is rejected', async () => {
    const { custody } = await makeCustody({
      intentGet: () =>
        ok(
          intentBody('intent-1', 'Rejected', {
            code: 'PolicyRejected',
            message: 'no',
          }),
        ),
    })

    await expect(
      custody.submitAndWait(PAYMENT_TX, makeContext(custody)),
    ).rejects.toThrow(IntentValidationError)
  })

  it('signs and submits a non-native transactor through the raw path, returning a xrpld result', async () => {
    const { custody } = await makeCustody({}, { allowRawSigning: true })
    const ledger = fakeLedger('RAWHASH')

    const result = await custody.submitAndWait(
      OFFER_CANCEL_TX,
      makeContext(custody, { ledger }),
    )

    expect(result).toMatchObject({ source: 'xrpld', txHash: 'RAWHASH' })
    expect(ledger.submitted).toHaveLength(1)
  })

  it('throws IntentPendingError when the native intent never reaches a terminal state', async () => {
    jest.useFakeTimers()
    try {
      const { custody } = await makeCustody({
        intentGet: () => ok(intentBody('intent-1', 'Open')),
      })

      let error: unknown
      const settled = custody
        .submitAndWait(PAYMENT_TX, makeContext(custody, { timeoutMs: 500 }))
        .catch((caught: unknown) => {
          error = caught
        })
      await jest.advanceTimersByTimeAsync(2000)
      await settled

      expect(error).toBeInstanceOf(IntentPendingError)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('RippleCustody.submitAsync', () => {
  it('posts a native intent and returns a handle without blocking on the outcome', async () => {
    const { custody, http } = await makeCustody({
      // Still pending: a blocking submit would hang, but submitAsync returns now.
      intentGet: () => ok(intentBody('intent-1', 'Open')),
    })

    const handle = await custody.submitAsync(PAYMENT_TX, makeContext(custody))

    expect(handle.kind).toBe('ripple-custody')
    expect(handle.id).toBeTruthy()
    expect(handle.custodian).toBe(custody)
    expect(
      http.requests.some(
        (request) =>
          request.method === 'POST' && request.url.endsWith('/v1/intents'),
      ),
    ).toBe(true)
  })

  it('handle.poll() reports the current (non-terminal) intent status without throwing', async () => {
    const { custody } = await makeCustody({
      intentGet: () => ok(intentBody('intent-1', 'Open')),
    })

    const handle = await custody.submitAsync(PAYMENT_TX, makeContext(custody))
    const snapshot = await handle.poll()

    expect(snapshot.source).toBe('custody')
    const entity = snapshot.response as { state: { status: string } }
    expect(entity.state.status).toBe('Open')
  })

  it('handle.wait() resolves once the intent reaches Executed', async () => {
    const { custody } = await makeCustody()

    const handle = await custody.submitAsync(PAYMENT_TX, makeContext(custody))
    const result = await handle.wait()

    expect(result.source).toBe('custody')
    expect(result.intentId).toBe(handle.id)
  })

  it('throws for the raw-signing path (async not supported there)', async () => {
    const { custody } = await makeCustody({}, { allowRawSigning: true })

    await expect(
      custody.submitAsync(OFFER_CANCEL_TX, makeContext(custody)),
    ).rejects.toThrow(SimpleXRPLError)
  })
})
