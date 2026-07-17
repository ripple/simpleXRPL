import type {
  HttpRequest,
  HttpResponse,
  PalisadeHttpPort,
} from '../../../src/custodians/palisade/transport/http-port.js'
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
    kind: 'palisade-custody',
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
 * In-memory {@link PalisadeHttpPort}. A per-test handler decides the response
 * from the request and a 0-based call index, and every request is recorded.
 */
export class FakeHttpPort implements PalisadeHttpPort {
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
 * Build a `ListGlobalWallets` collection page.
 *
 * @param wallets - The wallet specs to include.
 * @param nextPageToken - Optional next-page cursor.
 * @returns A wallets collection page body.
 */
export function walletsBody(
  wallets: ReadonlyArray<{
    id: string
    vaultId: string
    name?: string
    address?: string
    status?: string
  }>,
  nextPageToken?: string,
): JsonBody {
  return {
    wallets: wallets.map((wallet) => ({
      id: wallet.id,
      vaultId: wallet.vaultId,
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      name: wallet.name ?? '',
      address: wallet.address,
      keystore: {},
      blockchain: 'XRP_LEDGER',
      settings: {},
      status: wallet.status ?? 'PROVISIONED',
    })),
    filter: { total: wallets.length, nextPageToken },
  }
}
