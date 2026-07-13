/**
 * Common per-request options for the HTTP transport.
 */
export interface RequestConfig {
  /** Abort the request after this many milliseconds. */
  readonly timeout?: number

  /** External abort signal. */
  readonly signal?: AbortSignal

  /** Extra request headers. */
  readonly headers?: Record<string, string>
}

/**
 * A single HTTP request issued by a custodian adapter.
 */
export interface HttpRequest extends RequestConfig {
  /** The HTTP method. */
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

  /** The absolute request URL. */
  readonly url: string

  /** Query-string parameters. */
  readonly query?: Record<string, string | number | boolean | undefined>

  /** The request body, serialized by the implementation. */
  readonly body?: unknown
}

/**
 * A parsed HTTP response.
 */
export interface HttpResponse<T> {
  /** The HTTP status code. */
  readonly status: number

  /** The parsed response body. */
  readonly data: T

  /** Response headers, lower-cased keys. */
  readonly headers: Record<string, string>
}

/**
 * The HTTP transport port custodian adapters depend on. Backed by a real client
 * in production and by in-memory fakes in tests, so adapter mapping and
 * orchestration are exercised offline.
 */
export interface HttpTransport {
  /** Issue a request and resolve with the typed response. */
  readonly request: <T>(req: HttpRequest) => Promise<HttpResponse<T>>
}
