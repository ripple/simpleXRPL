import type { Logger } from '../ports/logger.js'
import { REDACTED_FIELDS } from '../ports/logger.js'

/**
 * The `debug` option on a custodian: `true` logs its HTTP traffic to
 * `console.debug`; a logger (anything with a `debug(message, fields)` method,
 * such as `console`, pino, or winston) receives it instead.
 */
export type HttpDebugOption = boolean | Pick<Logger, 'debug'>

/** The request shape both custodian transports share. */
interface LoggedRequest {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string
}

/** The response shape both custodian transports share. */
interface LoggedResponse {
  readonly status: number
  readonly body: string
}

/** A custodian transport: one `send` per HTTP request. */
interface SendPort<Req extends LoggedRequest, Res extends LoggedResponse> {
  send: (request: Req) => Promise<Res>
}

/** Who the traffic belongs to, and how to time it. */
export interface HttpLoggingOptions {
  /** The custodian kind, logged as the `custodian` field. */
  readonly custodian: string
  /** The custodian's name, as it leads each log message. */
  readonly label: string
  /** Milliseconds from a fixed point; defaults to `performance.now`. */
  readonly now?: () => number
}

/** What replaces a masked value. */
const MASK = '[REDACTED]'

/**
 * The longest body logged; the rest is cut (an instance's OpenAPI document,
 * fetched for version detection, runs to megabytes).
 */
const MAX_LOGGED_BODY = 8192

/** Field, header, and query names whose values are masked (lower-cased). */
const SECRET_NAMES: ReadonlySet<string> = new Set(
  [...REDACTED_FIELDS, 'cookie', 'set-cookie'].map((name) =>
    name.toLowerCase(),
  ),
)

/**
 * Whether a field, header, or query parameter carries a secret.
 *
 * @param name - Its name.
 * @returns `true` if its value must be masked.
 */
function isSecret(name: string): boolean {
  return SECRET_NAMES.has(name.toLowerCase())
}

/**
 * Mask secret header values, keeping an `Authorization` scheme (e.g.
 * `Bearer`) so the log still shows how the request authenticated.
 *
 * @param headers - The request headers.
 * @returns A masked copy.
 */
function maskHeaders(
  headers: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => {
      if (!isSecret(name)) {
        return [name, value]
      }
      const scheme = /^(?<scheme>\w+) \S/u.exec(value)?.groups?.scheme
      return [name, scheme === undefined ? MASK : `${scheme} ${MASK}`]
    }),
  )
}

/**
 * Mask secret values in a URL's query string.
 *
 * @param url - The absolute URL.
 * @returns The URL with secret query values masked.
 */
function maskUrl(url: string): string {
  const parsed = new URL(url)
  let masked = false
  for (const name of Array.from(parsed.searchParams.keys())) {
    if (isSecret(name)) {
      parsed.searchParams.set(name, MASK)
      masked = true
    }
  }
  return masked ? parsed.toString() : url
}

/** A parsed JSON value. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

/**
 * Mask every secret field in a parsed JSON value, at any depth.
 *
 * @param value - The parsed value.
 * @returns A masked copy.
 */
function maskJson(value: unknown): JsonValue {
  if (Array.isArray(value)) {
    return value.map(maskJson)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        isSecret(key) ? MASK : maskJson(child),
      ]),
    )
  }
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? value
    : null
}

/**
 * Mask the secrets in a request or response body — JSON, or a form-encoded
 * token request — and cut it to {@link MAX_LOGGED_BODY} characters.
 *
 * @param body - The serialized body.
 * @returns The body as it may be logged.
 */
function maskBody(body: string): string {
  let masked: string
  try {
    masked = JSON.stringify(maskJson(JSON.parse(body)))
  } catch {
    const form = new URLSearchParams(body)
    const secrets = Array.from(form.keys()).filter(isSecret)
    for (const name of secrets) {
      form.set(name, MASK)
    }
    masked = secrets.length === 0 ? body : form.toString()
  }
  if (masked.length <= MAX_LOGGED_BODY) {
    return masked
  }
  const cut = masked.length - MAX_LOGGED_BODY
  return `${masked.slice(0, MAX_LOGGED_BODY)}… (${cut} more characters)`
}

/**
 * Resolve the `debug` option to a logger.
 *
 * @param debug - The option.
 * @returns The logger to write to, or `undefined` when logging is off.
 */
function resolveLogger(
  debug: HttpDebugOption | undefined,
): Pick<Logger, 'debug'> | undefined {
  if (debug === true) {
    return console
  }
  return debug === false || debug === undefined ? undefined : debug
}

/**
 * A custodian transport that logs each request at debug level. See
 * {@link withHttpLogging}.
 */
class LoggingHttpPort<
  Req extends LoggedRequest,
  Res extends LoggedResponse,
> implements SendPort<Req, Res> {
  private readonly port: SendPort<Req, Res>
  private readonly logger: Pick<Logger, 'debug'>
  private readonly options: HttpLoggingOptions
  private readonly now: () => number

  /**
   * Construct a LoggingHttpPort.
   *
   * @param port - The transport to wrap.
   * @param logger - Where the log goes.
   * @param options - Who the traffic belongs to, and the clock.
   */
  public constructor(
    port: SendPort<Req, Res>,
    logger: Pick<Logger, 'debug'>,
    options: HttpLoggingOptions,
  ) {
    this.port = port
    this.logger = logger
    this.options = options
    this.now = options.now ?? ((): number => performance.now())
  }

  /**
   * Send the request through the wrapped transport, and log it.
   *
   * @param request - The raw HTTP request.
   * @returns The wrapped transport's response, unchanged.
   * @throws Whatever the wrapped transport throws, unchanged.
   */
  public async send(request: Req): Promise<Res> {
    const started = this.now()
    const url = maskUrl(request.url)
    const head = `${this.options.label} ${request.method} ${url}`
    const fields = {
      custodian: this.options.custodian,
      method: request.method,
      url,
      requestHeaders: maskHeaders(request.headers),
      ...(request.body === undefined
        ? {}
        : { requestBody: maskBody(request.body) }),
    }
    try {
      const response = await this.port.send(request)
      const durationMs = Math.round(this.now() - started)
      this.log(`${head} → ${response.status} (${durationMs} ms)`, {
        ...fields,
        status: response.status,
        durationMs,
        responseBody: maskBody(response.body),
      })
      return response
    } catch (error) {
      const durationMs = Math.round(this.now() - started)
      const reason = error instanceof Error ? error.message : String(error)
      this.log(`${head} failed (${durationMs} ms): ${reason}`, {
        ...fields,
        durationMs,
        error: reason,
      })
      throw error
    }
  }

  /**
   * Write one entry, ignoring a logger that throws.
   *
   * @param message - The one-line summary.
   * @param fields - The structured detail.
   */
  private log(message: string, fields: Record<string, unknown>): void {
    try {
      this.logger.debug(message, fields)
    } catch {
      // A broken logger must not fail the request it was only observing.
    }
  }
}

/**
 * Wrap a custodian transport so each request is logged at debug level: the
 * method, URL, status, and duration, plus the request headers and the request
 * and response bodies with every credential masked (the `Authorization`
 * header, tokens, and client secrets — see {@link REDACTED_FIELDS}).
 *
 * Logging never changes the outcome: a failed request is logged and rethrown
 * unchanged, and a logger that throws is ignored.
 *
 * @param port - The transport to wrap.
 * @param debug - The custodian's `debug` option.
 * @param options - Who the traffic belongs to, and the clock.
 * @returns The wrapped transport, or `port` itself when logging is off.
 */
export function withHttpLogging<
  Req extends LoggedRequest,
  Res extends LoggedResponse,
>(
  port: SendPort<Req, Res>,
  debug: HttpDebugOption | undefined,
  options: HttpLoggingOptions,
): SendPort<Req, Res> {
  const logger = resolveLogger(debug)
  return logger === undefined
    ? port
    : new LoggingHttpPort(port, logger, options)
}
