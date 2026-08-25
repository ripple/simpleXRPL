import {
  PalisadeApiError,
  PalisadeAuthError,
  SimpleXRPLError,
} from '../../../errors.js'
import type { PalisadeAuthService } from '../auth/palisade-auth.service.js'

import type { HttpResponse, PalisadeHttpPort } from './http-port.js'

const HTTP_UNAUTHORIZED = 401
const HTTP_ERROR_THRESHOLD = 400

/** Construction options for {@link PalisadeHttpClient}. */
export interface PalisadeHttpClientOptions {
  /** Palisade base URL (must be HTTPS). */
  baseUrl: string
  /** Injected transport (fetch in production, fake in tests). */
  http: PalisadeHttpPort
  /** Supplies and refreshes the bearer token. */
  auth: PalisadeAuthService
}

/** A scalar query value; `undefined` entries are dropped. */
type Query = Record<string, unknown>

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
 * Pull the `rpcStatus.message` diagnostic out of an error body, if present.
 * This is Palisade's equivalent of Custody's `processing.hint`.
 *
 * @param body - The raw error response text.
 * @returns The message string, or `undefined` if absent/unparseable.
 */
function extractMessage(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof parsed.message === 'string'
    ) {
      return parsed.message
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
 * @returns A {@link PalisadeAuthError} for 401, else a {@link PalisadeApiError}.
 */
function toError(response: HttpResponse): SimpleXRPLError {
  const apiError = new PalisadeApiError(
    response.status,
    response.body,
    extractMessage(response.body),
  )
  if (response.status === HTTP_UNAUTHORIZED) {
    // Preserve the status, body, and hint on the underlying API error rather
    // than discarding them behind a bare auth error — a 401 after refresh often
    // carries a diagnostic message the caller needs.
    return new PalisadeAuthError(
      'Palisade API authentication failed after token refresh',
      { cause: apiError },
    )
  }
  return apiError
}

/**
 * Authenticated client for the Palisade API.
 *
 * Injects the bearer token from {@link PalisadeAuthService} on every call and
 * implements the one-shot 401 recovery: a `401` triggers a single forced token
 * refresh and one replay; a second `401` surfaces as {@link PalisadeAuthError}.
 */
export class PalisadeHttpClient {
  private readonly baseUrl: string
  private readonly http: PalisadeHttpPort
  private readonly auth: PalisadeAuthService

  /**
   * Construct a PalisadeHttpClient.
   *
   * @param options - Base URL, transport port, and auth service.
   * @throws {@link SimpleXRPLError} if the base URL is not HTTPS.
   */
  public constructor(options: PalisadeHttpClientOptions) {
    if (!options.baseUrl.startsWith('https://')) {
      throw new SimpleXRPLError(
        `Palisade base URL must be HTTPS, got '${options.baseUrl}'`,
      )
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '')
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
   * Authenticated request for an arbitrary operation — the low-level primitive
   * behind {@link PalisadeApi}. Appends `query` and serializes `body` as JSON.
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
   * @throws {@link PalisadeAuthError} or {@link PalisadeApiError} on failure.
   */
  private async send(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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
      // One refresh-and-retry with a freshly exchanged token.
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
    const url = `${this.baseUrl}${path}`
    if (query === undefined) {
      return url
    }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      // Palisade query params are scalars; skip null/undefined and non-scalars.
      if (value !== undefined && value !== null && typeof value !== 'object') {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- narrowed to primitives above
        params.append(key, String(value))
      }
    }
    const queryString = params.toString()
    return queryString === '' ? url : `${url}?${queryString}`
  }
}
