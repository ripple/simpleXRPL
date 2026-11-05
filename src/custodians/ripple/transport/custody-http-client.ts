import {
  CustodyApiError,
  CustodyAuthError,
  CustodyPermissionError,
  CustodySignatureError,
  CustodyTimeoutError,
  SimpleXRPLError,
} from '../../../errors.js'
import type { CustodyAuthService } from '../auth/custody-auth.service.js'

import { DEFAULT_REQUEST_TIMEOUT_MS } from './http-port.js'
import type { CustodyHttpPort, HttpResponse } from './http-port.js'
import { knownIssueHint, type FailedRequest } from './known-issues.js'

const HTTP_UNAUTHORIZED = 401
const HTTP_ERROR_THRESHOLD = 400

/** Construction options for {@link CustodyHttpClient}. */
export interface CustodyHttpClientOptions {
  /** Custody gateway base URL (must be HTTPS). */
  gatewayUrl: string
  /** Injected transport (fetch in production, fake in tests). */
  http: CustodyHttpPort
  /** Supplies and refreshes the bearer token. */
  auth: CustodyAuthService
  /** Abort each request after this many milliseconds. Defaults to 30 000. */
  timeoutMs?: number
}

/** A query value; `undefined`/`null`/non-scalar entries are dropped. */
type Query = Record<string, unknown>

/**
 * Append one scalar query value. `undefined`/`null` and non-scalars (nested
 * objects) are dropped; everything else is coerced to a string.
 *
 * @param params - The accumulating search params.
 * @param key - The query parameter name.
 * @param value - The candidate value.
 */
function appendScalar(
  params: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value !== undefined && value !== null && typeof value !== 'object') {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- narrowed to primitives above
    params.append(key, String(value))
  }
}

/**
 * Parse a JSON response body into its OpenAPI-generated type.
 *
 * @param body - The raw response text (empty for void endpoints).
 * @returns The parsed value, or `undefined` for an empty body.
 */
function parseJsonBody<T>(body: string): T {
  if (body === '') {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Empty body for void-returning endpoints.
    return undefined as T
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Generated-contract assertion.
  return JSON.parse(body) as T
}

/**
 * The {@link CustodyAuthError} subclass for each `401` reason a token refresh
 * can't recover. Any other reason (e.g. `InvalidJwtError`) stays a plain
 * {@link CustodyAuthError}.
 */
const UNAUTHORIZED_ERRORS: Readonly<
  Record<
    string,
    new (message: string, options: { cause: unknown }) => CustodyAuthError
  >
> = {
  InvalidSignatureError: CustodySignatureError,
  PermissionDeniedError: CustodyPermissionError,
}

/**
 * Map a non-2xx response to the right typed error, with a hint when the
 * failure matches a known Custody server bug.
 *
 * @param request - The request that failed.
 * @param response - The failed HTTP response.
 * @returns A {@link CustodyAuthError} (or the subclass naming Custody's
 *   reason) for 401, else a {@link CustodyApiError}.
 */
function toError(
  request: FailedRequest,
  response: HttpResponse,
): SimpleXRPLError {
  const plain = new CustodyApiError(response.status, response.body)
  const hint = knownIssueHint(request, plain)
  const apiError =
    hint === undefined
      ? plain
      : new CustodyApiError(response.status, response.body, hint)
  if (response.status === HTTP_UNAUTHORIZED) {
    // The refresh-and-replay only recovers an expired JWT; report whatever
    // Custody still refused by its own reason, with the response as the cause.
    const ErrorClass =
      (apiError.reason === undefined
        ? undefined
        : UNAUTHORIZED_ERRORS[apiError.reason]) ?? CustodyAuthError
    return new ErrorClass(apiError.message, { cause: apiError })
  }
  return apiError
}

/**
 * Whether a transport error is the request timing out (`AbortSignal.timeout`
 * rejects with a `TimeoutError`; an aborted fetch with an `AbortError`).
 *
 * @param error - The transport's error.
 * @returns `true` for a timeout or abort.
 */
function isTimeout(error: unknown): boolean {
  // Matched by name, not class: the DOMException can come from another realm
  // (e.g. a Jest sandbox), where `instanceof Error` is false.
  const name: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'name')
      : undefined
  return name === 'TimeoutError' || name === 'AbortError'
}

/**
 * The intent id a request proposes, if it is an intent proposal.
 *
 * @param body - The serialized request body.
 * @returns The proposed intent's id, or `undefined`.
 */
function proposedIntentId(body: string | undefined): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body ?? '')
    const request: unknown =
      typeof parsed === 'object' && parsed !== null
        ? Reflect.get(parsed, 'request')
        : undefined
    if (
      typeof request === 'object' &&
      request !== null &&
      Reflect.get(request, 'type') === 'Propose'
    ) {
      const id: unknown = Reflect.get(request, 'id')
      return typeof id === 'string' ? id : undefined
    }
  } catch {
    // Not JSON: not a proposal.
  }
  return undefined
}

/**
 * Authenticated client for the Custody gateway API.
 *
 * Injects the JWT from {@link CustodyAuthService} on every call and implements
 * the one-shot 401 recovery: a `401` triggers a single forced token refresh and
 * one replay; a second `401` surfaces as {@link CustodyAuthError}, or the
 * subclass naming Custody's reason for it.
 */
export class CustodyHttpClient {
  private readonly gatewayUrl: string
  private readonly http: CustodyHttpPort
  private readonly auth: CustodyAuthService
  private readonly timeoutMs: number

  /**
   * Construct a CustodyHttpClient.
   *
   * @param options - Gateway URL, transport port, and auth service.
   * @throws {@link SimpleXRPLError} if the gateway URL is not HTTPS.
   */
  public constructor(options: CustodyHttpClientOptions) {
    if (!options.gatewayUrl.startsWith('https://')) {
      throw new SimpleXRPLError(
        `Custody gateway URL must be HTTPS, got '${options.gatewayUrl}'`,
      )
    }
    this.gatewayUrl = options.gatewayUrl.replace(/\/+$/u, '')
    this.http = options.http
    this.auth = options.auth
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  }

  /**
   * Authenticated GET.
   *
   * @param path - API path beginning with `/`.
   * @param query - Optional scalar query parameters.
   * @returns The parsed response body.
   */
  public async get<T>(path: string, query?: Query): Promise<T> {
    const response = await this.send('GET', this.buildUrl(path, query))
    return parseJsonBody<T>(response.body)
  }

  /**
   * Authenticated POST with a JSON body.
   *
   * @param path - API path beginning with `/`.
   * @param body - The request payload (serialized to JSON).
   * @returns The parsed response body.
   */
  public async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.send(
      'POST',
      this.buildUrl(path),
      JSON.stringify(body),
    )
    return parseJsonBody<T>(response.body)
  }

  /**
   * Authenticated request for an arbitrary operation — the low-level primitive
   * behind {@link CustodyApi}. Appends `query` and serializes `body` as JSON.
   *
   * @param method - The HTTP method.
   * @param path - API path beginning with `/` (path params already filled in).
   * @param options - Optional query parameters and/or JSON body.
   * @param options.query - Scalar query parameters.
   * @param options.body - The JSON request payload.
   * @returns The parsed response body.
   */
  public async invoke<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options?: { query?: Query; body?: unknown },
  ): Promise<T> {
    const body =
      options?.body === undefined ? undefined : JSON.stringify(options.body)
    const response = await this.send(
      method,
      this.buildUrl(path, options?.query),
      body,
    )
    return parseJsonBody<T>(response.body)
  }

  /**
   * Send with bearer injection and a single 401 refresh-and-replay.
   *
   * @param method - The HTTP method.
   * @param url - The absolute request URL.
   * @param body - Optional serialized request body.
   * @returns The successful HTTP response.
   * @throws {@link CustodyAuthError} or {@link CustodyApiError} on failure.
   * @throws {@link CustodyTimeoutError} if no response came within the timeout.
   */
  private async send(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    body?: string,
  ): Promise<HttpResponse> {
    let response = await this.sendOnce({ method, url, body }, false)
    if (response.status === HTTP_UNAUTHORIZED) {
      // One refresh-and-retry with a fresh challenge-signed token.
      response = await this.sendOnce({ method, url, body }, true)
    }
    if (response.status >= HTTP_ERROR_THRESHOLD) {
      throw toError({ url, body }, response)
    }
    return response
  }

  /**
   * Send once with a bearer token, turning a timeout into a typed error.
   *
   * @param request - The request.
   * @param request.method - The HTTP method.
   * @param request.url - The absolute request URL.
   * @param request.body - Optional serialized request body.
   * @param forceRefresh - Fetch a fresh token first.
   * @returns The HTTP response, whatever its status.
   * @throws {@link CustodyTimeoutError} if no response came within the timeout.
   */
  private async sendOnce(
    request: {
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      url: string
      body: string | undefined
    },
    forceRefresh: boolean,
  ): Promise<HttpResponse> {
    const { method, url, body } = request
    const token = await this.auth.getToken(forceRefresh)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }
    try {
      return await this.http.send({
        method,
        url,
        headers,
        body,
        timeoutMs: this.timeoutMs,
      })
    } catch (error) {
      if (!isTimeout(error)) {
        throw error
      }
      throw new CustodyTimeoutError(
        {
          method,
          path: new URL(url).pathname,
          timeoutMs: this.timeoutMs,
          intentId: proposedIntentId(body),
        },
        { cause: error },
      )
    }
  }

  /**
   * Build an absolute URL with optional scalar query params.
   *
   * @param path - API path beginning with `/`.
   * @param query - Optional scalar query parameters.
   * @returns The absolute URL.
   */
  private buildUrl(path: string, query?: Query): string {
    const url = `${this.gatewayUrl}${path}`
    if (query === undefined) {
      return url
    }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      // Some Custody query params are arrays (e.g. `lock`, `intentTypes`) — those
      // serialize as repeated params (?k=a&k=b). Scalars append once; null,
      // undefined, and nested objects are dropped.
      if (Array.isArray(value)) {
        for (const item of value) {
          appendScalar(params, key, item)
        }
      } else {
        appendScalar(params, key, value)
      }
    }
    const queryString = params.toString()
    return queryString === '' ? url : `${url}?${queryString}`
  }
}
