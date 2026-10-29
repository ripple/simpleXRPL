import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Wallet } from 'xrpl'
import type { OfferCancel, Payment, TxResponse } from 'xrpl'

import type { CustodyProposePayload } from '../../../src/custodians/ripple/api.js'
import { RippleCustody } from '../../../src/custodians/ripple/ripple-custody.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import type { CustodyApiVersion } from '../../../src/custodians/ripple/versioning/capabilities.js'
import type { SubmissionContext } from '../../../src/domain/index.js'
import {
  AccountNotFoundError,
  CustodyAuthError,
  IntentPendingError,
  IntentValidationError,
  SignerCapabilityError,
  SimpleXRPLError,
  UnsupportedInVersionError,
  XrpldSubmitError,
} from '../../../src/errors.js'
import { makeJwt } from '../custody-auth/test-utils.js'
import {
  accountsBody,
  addressesBody,
  ledgersBody,
} from '../custody-discovery/test-utils.js'
import type { FakeLedger } from '../pipeline/fake-ledger.js'

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
  status,
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
  transactions?: () => HttpResponse
  manifestGet?: () => HttpResponse
  dryRun?: (body: unknown) => HttpResponse
  openApi?: () => HttpResponse
}

/**
 * The instance's OpenAPI document version detection reads: by default the
 * vendored spec, so the custodian resolves the version the SDK is built against.
 */
const VENDORED_SPEC = readFileSync(
  join(process.cwd(), 'openapi', 'custody-openapi.json'),
  'utf8',
)

/**
 * A one-item transactions collection linking a Confirmed on-ledger transaction
 * to the submitted intent — the default the native submit path polls for.
 *
 * @param hash - The on-ledger transaction hash to report.
 * @returns A `Core_TransactionsCollection`-shaped body.
 */
function confirmedTxCollection(hash = 'FAKEHASH'): Record<string, unknown> {
  return {
    count: 1,
    items: [
      {
        id: 'tx-1',
        orderReference: { id: 'intent-1', domainId: DOMAIN_ID },
        ledgerTransactionData: {
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: hash,
          ledgerData: null,
        },
      },
    ],
  }
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
      test: (request): boolean => request.url.includes('/api/OpenAPI'),
      respond: (): HttpResponse =>
        (
          routes.openApi ?? ((): HttpResponse => ok(JSON.parse(VENDORED_SPEC)))
        )(),
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
      test: (request): boolean => request.url.includes('/transactions'),
      respond: (): HttpResponse =>
        (
          routes.transactions ??
          ((): HttpResponse => ok(confirmedTxCollection()))
        )(),
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
 * @param options.apiVersion - Pin the Custody version instead of detecting it.
 * @param options.autoDetectVersion - Detect the version from the instance.
 * @returns The ready custodian and the underlying fake port.
 */
async function makeCustody(
  routes: Routes = {},
  options: {
    allowRawSigning?: boolean
    defaultDryRun?: boolean
    apiVersion?: CustodyApiVersion
    autoDetectVersion?: boolean
  } = {},
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
    apiVersion: options.apiVersion,
    autoDetectVersion: options.autoDetectVersion,
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
        networkId: 0,
        signer: custody,
      },
    ])
  })

  it('exposes the Custody domain as its tenant id, so two signers on one domain collide', async () => {
    const { custody } = await makeCustody()

    expect(custody.tenantId).toBe(DOMAIN_ID)
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
  it('submits a native transactor as a governed intent, confirms on-chain, and returns the on-ledger hash', async () => {
    const { custody, http } = await makeCustody()

    const result = await custody.submitAndWait(PAYMENT_TX, makeContext(custody))

    expect(result.source).toBe('custody')
    expect(result.intentId).toBeTruthy()
    // Success now carries the real on-ledger hash, not just the executed intent.
    expect(result.txHash).toBe('FAKEHASH')
    expect(
      http.requests.some(
        (request) =>
          request.method === 'POST' && request.url.endsWith('/v1/intents'),
      ),
    ).toBe(true)
    // It drove past the governance intent to the on-chain transaction layer.
    expect(
      http.requests.some((request) => request.url.includes('/transactions')),
    ).toBe(true)
  })

  it('throws XrpldSubmitError when a native transactor lands on-ledger with a tec', async () => {
    // Custody confirms the transaction on-chain, but the ledger reports a tec:
    // on-ledger, fee burned, intent not achieved — never a success.
    const { custody } = await makeCustody()
    const ledger = fakeLedger('FAKEHASH', { txResult: 'tecUNFUNDED_PAYMENT' })

    await expect(
      custody.submitAndWait(PAYMENT_TX, makeContext(custody, { ledger })),
    ).rejects.toBeInstanceOf(XrpldSubmitError)
  })

  it('throws IntentPendingError when the on-chain transaction never confirms', async () => {
    // The intent executed, but the linked transaction stays in flight: an
    // indeterminate outcome, surfaced as pending rather than success.
    const { custody } = await makeCustody({
      transactions: () =>
        ok({
          count: 1,
          items: [
            {
              id: 'tx-1',
              orderReference: { id: 'intent-1', domainId: DOMAIN_ID },
              ledgerTransactionData: {
                ledgerStatus: 'Detected',
                ledgerTransactionId: '',
                ledgerData: null,
              },
            },
          ],
        }),
    })

    await expect(
      custody.submitAndWait(
        PAYMENT_TX,
        makeContext(custody, { timeoutMs: 500 }),
      ),
    ).rejects.toBeInstanceOf(IntentPendingError)
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

  it('surfaces a non-tesSUCCESS engine result from the raw path as XrpldSubmitError', async () => {
    const { custody } = await makeCustody({}, { allowRawSigning: true })
    const failing: FakeLedger = {
      ...fakeLedger(),
      submitAndWait: async (): Promise<TxResponse> =>
        ({
          result: { hash: 'H', meta: { TransactionResult: 'tecNO_LINE' } },
        }) as unknown as TxResponse,
    }

    await expect(
      custody.submitAndWait(
        OFFER_CANCEL_TX,
        makeContext(custody, { ledger: failing }),
      ),
    ).rejects.toBeInstanceOf(XrpldSubmitError)
  })

  it('absorbs a 409 on the intent POST and resolves the existing intent (same-key re-drive)', async () => {
    // Re-driving an already-accepted idempotency key: Custody returns 409, and
    // the SDK observes the existing (Executed) intent rather than throwing.
    const { custody } = await makeCustody({
      intentCreate: () => status(409, { message: 'intent already exists' }),
    })

    const result = await custody.submitAndWait(PAYMENT_TX, makeContext(custody))

    expect(result.source).toBe('custody')
    expect(result.intentId).toBeTruthy()
  })

  it('re-throws a non-409 error from the intent POST', async () => {
    const { custody } = await makeCustody({
      intentCreate: () => status(500, { message: 'boom' }),
    })

    await expect(
      custody.submitAndWait(PAYMENT_TX, makeContext(custody)),
    ).rejects.toThrow(SimpleXRPLError)
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

  it('absorbs a 409 on the intent POST and returns a handle over the existing intent', async () => {
    const { custody } = await makeCustody({
      intentCreate: () => status(409, { message: 'intent already exists' }),
      intentGet: () => ok(intentBody('intent-1', 'Open')),
    })

    const handle = await custody.submitAsync(PAYMENT_TX, makeContext(custody))

    expect(handle.kind).toBe('ripple-custody')
    expect(handle.id).toBeTruthy()
  })

  it('throws for the raw-signing path (async not supported there)', async () => {
    const { custody } = await makeCustody({}, { allowRawSigning: true })

    await expect(
      custody.submitAsync(OFFER_CANCEL_TX, makeContext(custody)),
    ).rejects.toThrow(SimpleXRPLError)
  })
})

describe('RippleCustody version checks', () => {
  const VENDORED_VERSION: unknown =
    JSON.parse(VENDORED_SPEC).info['x-app-version']

  /**
   * Whether any recorded request hit a URL containing `fragment`.
   *
   * @param http - The fake transport.
   * @param fragment - The URL fragment to look for.
   * @returns `true` if a request matched.
   */
  const requested = (http: FakeHttpPort, fragment: string): boolean =>
    http.requests.some((request) => request.url.includes(fragment))

  let warn: jest.SpyInstance
  beforeEach(() => {
    warn = jest.spyOn(process, 'emitWarning').mockReturnValue(undefined)
  })
  afterEach(() => {
    warn.mockRestore()
  })

  it('detects the version from the instance OpenAPI document, without credentials', async () => {
    const { custody, http } = await makeCustody()

    expect(custody.backendVersion).toBe(VENDORED_VERSION)
    const specRequest = http.requests.find((request) =>
      request.url.includes('/api/OpenAPI'),
    )
    expect(specRequest?.url).toBe(
      'https://custody.example.com/api/OpenAPI?scope=&layout=',
    )
    expect(specRequest?.headers.Authorization).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })

  it('uses a pinned version without fetching the document', async () => {
    const { custody, http } = await makeCustody({}, { apiVersion: '1.35' })

    expect(custody.backendVersion).toBe('1.35')
    expect(requested(http, '/api/OpenAPI')).toBe(false)
  })

  it('rejects an unknown pinned version', async () => {
    await expect(
      makeCustody({}, { apiVersion: '9.99' as CustodyApiVersion }),
    ).rejects.toThrow(/Unknown Ripple Custody apiVersion '9\.99'/u)
  })

  it('blocks a native write the version has no operation for, before posting an intent', async () => {
    // Custody 1.23–1.31 modelled XRPL orders as plain payments, with no
    // native operations at all.
    const { custody, http } = await makeCustody({}, { apiVersion: '1.31' })

    const submission = custody.submitAndWait(PAYMENT_TX, makeContext(custody))

    await expect(submission).rejects.toBeInstanceOf(UnsupportedInVersionError)
    await expect(submission).rejects.toMatchObject({
      kind: 'xrplOperation',
      capability: 'Payment',
      sdkMethod: 'submitting Payment',
      appVersion: '1.31',
      source: 'pinned',
    })
    expect(
      http.requests.some(
        (request) =>
          request.method === 'POST' && request.url.endsWith('/v1/intents'),
      ),
    ).toBe(false)
  })

  it('blocks api.call for an endpoint the version does not serve', async () => {
    // GET /v1/health arrived in 1.36.
    const { custody, http } = await makeCustody({}, { apiVersion: '1.35' })

    await expect(
      custody.api.call('HealthController_liveness'),
    ).rejects.toMatchObject({
      kind: 'endpoint',
      capability: 'GET /v1/health',
      sdkMethod: "api.call('HealthController_liveness')",
    })
    expect(requested(http, '/v1/health')).toBe(false)
  })

  it('blocks api.propose of a transaction order whose XRPL operation the version lacks', async () => {
    const { custody } = await makeCustody({}, { apiVersion: '1.31' })
    const payload = {
      type: 'v0_CreateTransactionOrder',
      id: '00000000-0000-7000-8000-000000000000',
      accountId: ACCOUNT_ID,
      parameters: {
        type: 'XRPL',
        operation: { type: 'TrustSet' },
      },
      customProperties: {},
    } as unknown as CustodyProposePayload

    await expect(custody.api.propose(payload)).rejects.toMatchObject({
      kind: 'xrplOperation',
      capability: 'TrustSet',
      sdkMethod: 'api.propose',
    })
  })

  it('lets calls through, warning once, when the document cannot be fetched', async () => {
    const { custody } = await makeCustody({ openApi: () => status(404) })

    expect(custody.backendVersion).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('HTTP 404'),
      expect.objectContaining({
        code: 'SIMPLEXRPL_CUSTODY_VERSION_UNDETECTED',
      }),
    )
    await expect(
      custody.submitAndWait(PAYMENT_TX, makeContext(custody)),
    ).resolves.toMatchObject({ source: 'custody' })
  })

  it('skips detection silently when autoDetectVersion is false', async () => {
    const { custody, http } = await makeCustody(
      {},
      { autoDetectVersion: false },
    )

    expect(custody.backendVersion).toBeUndefined()
    expect(requested(http, '/api/OpenAPI')).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })
})
