import {
  CustodyApiError,
  CustodyAuthError,
  SimpleXRPLError,
} from '../../../errors.js'
import type { CustodyAuthService } from '../auth/custody-auth.service.js'

import type { CustodyHttpPort, HttpResponse } from './http-port.js'

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
}

/** A scalar query value; `undefined` entries are dropped. */
type QueryValue = string | number | undefined
type Query = Record<string, QueryValue>

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
 * Pull Custody's `processing.hint` out of an error body, if present.
 *
 * @param body - The raw error response text.
 * @returns The hint string, or `undefined` if absent/unparseable.
 */
function extractHint(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'processing' in parsed &&
      typeof parsed.processing === 'object' &&
      parsed.processing !== null &&
      'hint' in parsed.processing &&
      typeof parsed.processing.hint === 'string'
    ) {
      return parsed.processing.hint
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Map a non-2xx response to the right typed error.
 *
 * @param response - The failed HTTP response.
 * @returns A {@link CustodyAuthError} for 401, else a {@link CustodyApiError}.
 */
function toError(response: HttpResponse): SimpleXRPLError {
  const apiError = new CustodyApiError(
    response.status,
    response.body,
    extractHint(response.body),
  )
  if (response.status === HTTP_UNAUTHORIZED) {
    // A 401 on `/v1/intents` is one of InvalidJwtError, InvalidSignatureError,
    // or PermissionDeniedError — the refresh-and-replay only recovers the
    // first. Preserve the response body as the cause so the actual error type
    // isn't swallowed by the generic "after token refresh" message.
    return new CustodyAuthError(
      'Custody API authentication failed after token refresh',
      { cause: apiError },
    )
  }
  return apiError
}

/**
 * Authenticated client for the Custody gateway API.
 *
 * Injects the JWT from {@link CustodyAuthService} on every call and implements
 * the one-shot 401 recovery: a `401` triggers a single forced token refresh and
 * one replay; a second `401` surfaces as {@link CustodyAuthError}. (This is the
 * 401-retry deferred from the auth work, which had no HTTP client yet.)
 */
export class CustodyHttpClient {
  private readonly gatewayUrl: string
  private readonly http: CustodyHttpPort
  private readonly auth: CustodyAuthService

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
   * Send with bearer injection and a single 401 refresh-and-replay.
   *
   * @param method - The HTTP method.
   * @param url - The absolute request URL.
   * @param body - Optional serialized request body.
   * @returns The successful HTTP response.
   * @throws {@link CustodyAuthError} or {@link CustodyApiError} on failure.
   */
  private async send(
    method: 'GET' | 'POST',
    url: string,
    body?: string,
  ): Promise<HttpResponse> {
    const attempt = async (forceRefresh: boolean): Promise<HttpResponse> => {
      const token = await this.auth.getToken(forceRefresh)
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      }
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
      }
      return this.http.send({ method, url, headers, body })
    }

    let response = await attempt(false)
    if (response.status === HTTP_UNAUTHORIZED) {
      // One refresh-and-retry with a fresh challenge-signed token.
      response = await attempt(true)
    }
    if (response.status >= HTTP_ERROR_THRESHOLD) {
      throw toError(response)
    }
    return response
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
      if (value !== undefined) {
        params.append(key, String(value))
      }
    }
    const queryString = params.toString()
    return queryString === '' ? url : `${url}?${queryString}`
  }
}
