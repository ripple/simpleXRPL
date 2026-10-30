import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  detectedCapabilities,
  endpointKey,
  extractCapabilityLists,
  pinnedCapabilities,
} from '../../../src/custodians/ripple/versioning/capabilities.js'
import type { CustodyCapabilities } from '../../../src/custodians/ripple/versioning/capabilities.js'
import { resolveVersionGuard } from '../../../src/custodians/ripple/versioning/detect.js'
import { VersionGuard } from '../../../src/custodians/ripple/versioning/version-guard.js'
import {
  SimpleXRPLError,
  UnsupportedInVersionError,
} from '../../../src/errors.js'
import {
  CUSTODY_CAPABILITIES,
  type KnownCustodyVersion,
} from '../../../src/generated/custody-capabilities.js'

import { FakeHttpPort, ok, status } from './test-utils.js'

const VENDORED_SPEC: unknown = JSON.parse(
  readFileSync(join(process.cwd(), 'openapi', 'custody-openapi.json'), 'utf8'),
)
const GATEWAY = 'https://custody.example.com'

/**
 * Capabilities for a hand-built version.
 *
 * @param overrides - Fields to replace.
 * @returns The capabilities.
 */
function caps(
  overrides: Partial<CustodyCapabilities> = {},
): CustodyCapabilities {
  return {
    appVersion: '1.99.0',
    source: 'detected',
    endpoints: new Set([endpointKey('GET', '/v1/domains/{domainId}')]),
    xrplOperations: new Set(['Payment']),
    intentTypes: new Set(['v0_CreateTransactionOrder', 'v0_SignManifest']),
    ...overrides,
  }
}

const sorted = (values: readonly string[]): string[] =>
  Array.from(values).sort((left, right) => left.localeCompare(right))

describe('bundled capability data', () => {
  it('matches what the runtime extracts from the vendored spec', () => {
    // The data is built by scripts/lib/custody-docs.mjs; this keeps that
    // extractor and the runtime one in step.
    const { info } = VENDORED_SPEC as { info: Record<string, string> }
    const minor = /^\d+\.\d+/u.exec(info['x-app-version'])?.[0]
    expect(minor).toBeDefined()
    const bundled = CUSTODY_CAPABILITIES[minor as KnownCustodyVersion]
    expect(bundled).toBeDefined()

    const runtime = extractCapabilityLists(VENDORED_SPEC)
    expect(sorted(runtime.endpoints)).toEqual(sorted(bundled.endpoints))
    expect(sorted(runtime.xrplOperations)).toEqual(
      sorted(bundled.xrplOperations),
    )
    expect(sorted(runtime.intentTypes)).toEqual(sorted(bundled.intentTypes))
  })

  it('has every endpoint the SDK calls itself, in every bundled version', () => {
    const sdkEndpoints = [
      ['GET', '/v1/me'],
      ['GET', '/v1/ledgers'],
      ['GET', '/v1/domains/{domainId}/accounts'],
      ['GET', '/v1/domains/{domainId}/accounts/{accountId}'],
      ['GET', '/v1/domains/{domainId}/accounts/{accountId}/addresses'],
      [
        'GET',
        '/v1/domains/{domainId}/accounts/{accountId}/manifests/{manifestId}',
      ],
      ['GET', '/v1/domains/{domainId}/intents/{intentId}'],
      ['GET', '/v1/domains/{domainId}/transactions'],
      ['POST', '/v1/intents'],
      ['POST', '/v1/intents/dry-run'],
    ]
    for (const version of Object.keys(CUSTODY_CAPABILITIES)) {
      const { endpoints } = pinnedCapabilities(version)
      const missing = sdkEndpoints.filter(
        ([method, path]) => !endpoints.has(endpointKey(method, path)),
      )
      expect({ version, missing }).toEqual({ version, missing: [] })
    }
  })
})

describe('endpointKey', () => {
  it('ignores path parameter names and doubled slashes', () => {
    expect(endpointKey('get', '//v1/domains/{id}/accounts/{accountId}')).toBe(
      endpointKey('GET', '/v1/domains/{domainId}/accounts/{x}'),
    )
  })
})

describe('extractCapabilityLists', () => {
  it('reads union members’ type enums when the union has no discriminator mapping', () => {
    const lists = extractCapabilityLists({
      paths: { '/v1/me': { get: {}, parameters: [] } },
      components: {
        schemas: {
          Core_XrplOperation: {
            oneOf: [
              { $ref: '#/components/schemas/Core_XrplOperation_Payment' },
              { properties: { type: { enum: ['TrustSet'] } } },
            ],
          },
          Core_XrplOperation_Payment: {
            properties: { type: { enum: ['Payment'] } },
          },
        },
      },
    })

    expect(lists).toEqual({
      endpoints: ['GET /v1/me'],
      xrplOperations: ['Payment', 'TrustSet'],
      intentTypes: [],
    })
  })

  it('tolerates a document with nothing in it', () => {
    expect(extractCapabilityLists(null)).toEqual({
      endpoints: [],
      xrplOperations: [],
      intentTypes: [],
    })
  })
})

describe('detectedCapabilities', () => {
  it('reports the instance version, or "unknown" when the document has none', () => {
    expect(detectedCapabilities(VENDORED_SPEC).source).toBe('detected')
    expect(
      detectedCapabilities({ paths: { '/v1/me': { get: {} } } }).appVersion,
    ).toBe('unknown')
  })

  it('rejects a document with no endpoints', () => {
    expect(() => detectedCapabilities({ info: {} })).toThrow(SimpleXRPLError)
  })
})

describe('pinnedCapabilities', () => {
  it('accepts a patch level, keeping it as the reported version', () => {
    const pinned = pinnedCapabilities('1.43.4')

    expect(pinned.appVersion).toBe('1.43.4')
    expect(pinned.source).toBe('pinned')
    expect(pinned.xrplOperations).toEqual(
      new Set(CUSTODY_CAPABILITIES['1.43'].xrplOperations),
    )
  })

  it.each(['9.99', '1.43.4.1', 'v1.43', 'latest'])(
    'rejects %s, listing the known versions',
    (version) => {
      expect(() => pinnedCapabilities(version)).toThrow(/Known versions: 1\./u)
    },
  )
})

describe('VersionGuard', () => {
  it('lets everything through when no version is resolved', () => {
    const guard = new VersionGuard(undefined)

    expect(guard.appVersion).toBeUndefined()
    expect(() => {
      guard.assertEndpoint('DELETE', '/v1/anything', 'x')
      guard.assertNativeTransaction('Payment')
      guard.assertRawSigning('SetRegularKey')
    }).not.toThrow()
  })

  it('matches an endpoint whose parameter names differ from the version’s', () => {
    expect(() => {
      new VersionGuard(caps()).assertEndpoint('GET', '/v1/domains/{id}', 'x')
    }).not.toThrow()
  })

  it('names what is missing, for whom, and on which version', () => {
    const guard = new VersionGuard(caps())

    expect(() => {
      guard.assertEndpoint('post', '/v1/exports/movement', 'api.call(x)')
    }).toThrow(
      "api.call(x) needs the endpoint 'POST /v1/exports/movement', which " +
        'Ripple Custody 1.99.0 (detected) does not support.',
    )
  })

  it('checks a native write’s intent type as well as its operation', () => {
    const guard = new VersionGuard(caps({ intentTypes: new Set() }))

    expect(() => {
      guard.assertNativeTransaction('Payment')
    }).toThrow(
      expect.objectContaining({
        kind: 'intentType',
        capability: 'v0_CreateTransactionOrder',
      }),
    )
    expect(() => {
      new VersionGuard(caps()).assertNativeTransaction('TrustSet')
    }).toThrow(UnsupportedInVersionError)
  })

  it('checks raw signing’s intent type', () => {
    const guard = new VersionGuard(caps({ intentTypes: new Set() }))

    expect(() => {
      guard.assertRawSigning('SetRegularKey')
    }).toThrow(
      expect.objectContaining({
        capability: 'v0_SignManifest',
        sdkMethod: 'raw-signing SetRegularKey',
      }),
    )
  })
})

describe('resolveVersionGuard', () => {
  let warn: jest.SpyInstance
  beforeEach(() => {
    warn = jest.spyOn(process, 'emitWarning').mockReturnValue(undefined)
  })
  afterEach(() => {
    warn.mockRestore()
  })

  it('prefers a pinned version over detection', async () => {
    const http = new FakeHttpPort(() => ok(VENDORED_SPEC))

    const guard = await resolveVersionGuard(
      { apiVersion: '1.36', openApiUrl: `${GATEWAY}/spec` },
      http,
      GATEWAY,
    )

    expect(guard.appVersion).toBe('1.36')
    expect(http.requests).toHaveLength(0)
  })

  it('fetches a custom openApiUrl', async () => {
    const http = new FakeHttpPort(() => ok(VENDORED_SPEC))

    await resolveVersionGuard(
      { openApiUrl: `${GATEWAY}/custom/spec.json` },
      http,
      GATEWAY,
    )

    expect(http.requests.map((request) => request.url)).toEqual([
      `${GATEWAY}/custom/spec.json`,
    ])
  })

  it('refuses a non-HTTPS openApiUrl', async () => {
    await expect(
      resolveVersionGuard(
        { openApiUrl: 'http://custody.example.com/spec' },
        new FakeHttpPort(() => ok(VENDORED_SPEC)),
        GATEWAY,
      ),
    ).rejects.toThrow(/must be HTTPS/u)
  })

  it.each([
    [
      'an error status',
      (): FakeHttpPort => new FakeHttpPort(() => status(503)),
      'HTTP 503',
    ],
    [
      'a non-JSON body',
      (): FakeHttpPort =>
        new FakeHttpPort(() => ({ status: 200, body: '<html>' })),
      'not JSON',
    ],
    [
      'a transport failure',
      (): FakeHttpPort =>
        new FakeHttpPort(() => {
          throw new Error('ECONNREFUSED')
        }),
      'ECONNREFUSED',
    ],
  ])('fails open with a warning on %s', async (_label, makeHttp, reason) => {
    const guard = await resolveVersionGuard({}, makeHttp(), GATEWAY)

    expect(guard.appVersion).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(reason),
      expect.objectContaining({
        code: 'SIMPLEXRPL_CUSTODY_VERSION_UNDETECTED',
      }),
    )
  })
})
