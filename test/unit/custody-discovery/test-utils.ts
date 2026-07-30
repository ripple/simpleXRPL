import type {
  CustodyHttpPort,
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import type { Custodian } from '../../../src/domain/index.js'

/** A JSON-ish fixture body. */
type JsonBody = Record<string, unknown>

const NOT_IMPLEMENTED = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/**
 * A minimal fake `Custodian`, only ever used as an `Account.signer`
 * back-reference in discovery/context tests — none of these tests dispatch
 * through it, so every method beyond `kind`/`primary` just rejects.
 *
 * @returns A stub custodian satisfying the `Custodian` interface.
 */
export function makeFakeSigner(): Custodian {
  return {
    kind: 'ripple-custody',
    primary: { address: 'rPrimary' },
    listAccounts: async () => [],
    capabilities: () => ({ nativeOps: new Set(), allowRaw: false }),
    sign: NOT_IMPLEMENTED,
    submitAndWait: NOT_IMPLEMENTED,
    submitAsync: NOT_IMPLEMENTED,
  }
}

const HTTP_OK = 200

/**
 * In-memory {@link CustodyHttpPort}. A per-test handler decides the response
 * from the request and a 0-based call index, and every request is recorded.
 */
export class FakeHttpPort implements CustodyHttpPort {
  public readonly requests: HttpRequest[] = []
  private callIndex = 0

  public constructor(
    private readonly handler: (
      request: HttpRequest,
      callIndex: number,
    ) => HttpResponse,
  ) {}

  /**
   * Record the request and return the handler's response.
   *
   * @param request - The raw HTTP request.
   * @returns The handler-provided response.
   */
  public async send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request)
    const response = this.handler(request, this.callIndex)
    this.callIndex += 1
    return response
  }
}

/**
 * A 200 JSON response.
 *
 * @param body - The body to serialize.
 * @returns The HTTP response.
 */
export function ok(body: unknown): HttpResponse {
  return { status: HTTP_OK, body: JSON.stringify(body) }
}

/**
 * A response with an arbitrary status and JSON body.
 *
 * @param code - The HTTP status code.
 * @param body - The body to serialize (defaults to `{}`).
 * @returns The HTTP response.
 */
export function status(code: number, body: unknown = {}): HttpResponse {
  return { status: code, body: JSON.stringify(body) }
}

/**
 * Build a `getLedgers` collection body from `{ id, type }` ledger specs.
 *
 * @param ledgers - The ledger specs to include.
 * @returns A ledgers collection body.
 */
export function ledgersBody(
  ledgers: ReadonlyArray<{ id: string; type: string }>,
): JsonBody {
  return {
    items: ledgers.map((ledger) => ({
      data: {
        id: ledger.id,
        alias: ledger.id,
        parameters: { type: ledger.type },
        metadata: {},
      },
      signature: '',
      signingKey: '',
    })),
    count: ledgers.length,
  }
}

/**
 * Build a `getAccounts` collection page.
 *
 * @param accounts - The account specs to include. `additionalDetailsLedgers`
 * models a multi-ledger Vault account (top-level `ledgerId: null`, with
 * per-ledger status reported under `additionalDetails.ledgers` instead).
 * @param nextStartingAfter - Optional next-page cursor.
 * @returns An accounts collection page body.
 */
export function accountsBody(
  accounts: ReadonlyArray<{
    id: string
    alias?: string
    ledgerId?: string | null
    additionalDetailsLedgers?: ReadonlyArray<{
      ledgerId: string
      status: string
    }>
  }>,
  nextStartingAfter?: string,
): JsonBody {
  return {
    items: accounts.map((account) => ({
      data: {
        id: account.id,
        domainId: 'dom-1',
        alias: account.alias ?? '',
        ledgerId: account.ledgerId,
        providerDetails: {},
        lock: 'Unlocked',
        metadata: {},
      },
      signature: '',
      signingKey: '',
      ...(account.additionalDetailsLedgers === undefined
        ? {}
        : {
            additionalDetails: {
              processing: {},
              ledgers: account.additionalDetailsLedgers,
            },
          }),
    })),
    count: accounts.length,
    nextStartingAfter,
  }
}

/**
 * Build a `getAddresses` collection page.
 *
 * @param addresses - The address specs to include.
 * @returns An addresses collection page body.
 */
export function addressesBody(
  addresses: ReadonlyArray<{
    address: string
    scope: string
    ledgerId: string
    accountId: string
  }>,
): JsonBody {
  return {
    items: addresses.map((entry) => ({
      data: {
        id: `addr-${entry.address}`,
        ledgerId: entry.ledgerId,
        accountId: entry.accountId,
        address: entry.address,
        scope: entry.scope,
        createdAt: '2026-01-01T00:00:00Z',
      },
    })),
    count: addresses.length,
  }
}
