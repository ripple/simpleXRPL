import { PalisadeAuthError } from '../../../errors.js'

import type { PalisadeAuthPort } from './ports.js'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const SAFETY_BUFFER_MINUTES = 5
const DEFAULT_VALIDITY_MINUTES = 10

/** Treat the token as expired this long before its real expiry (~5 min). */
const EXPIRY_SAFETY_BUFFER_MS =
  SAFETY_BUFFER_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND
/**
 * Fallback validity when the exchange response carries no usable `expiresIn`.
 * Kept short and safety-first: an unusable lifetime means the real expiry is
 * unknown, so it's better to refresh too often than to sit on a token that may
 * already be dead server-side.
 */
const DEFAULT_TOKEN_VALIDITY_MS =
  DEFAULT_VALIDITY_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND

/**
 * Convert the response's `expiresIn` (seconds) to a validity window in ms,
 * falling back to a short default if the value is missing or unusable.
 *
 * @param expiresIn - Seconds until expiry, per the exchange response.
 * @returns The validity window in milliseconds.
 */
function validityMs(expiresIn: number): number {
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    return DEFAULT_TOKEN_VALIDITY_MS
  }
  return expiresIn * MS_PER_SECOND
}

/** Construction options for {@link PalisadeAuthService}. */
export interface PalisadeAuthServiceOptions {
  /** Credential-exchange endpoint port (HTTP in production, fake in tests). */
  authPort: PalisadeAuthPort
  /** The Palisade client ID. */
  clientId: string
  /**
   * The Palisade client secret. Never logged or persisted: the service stores it
   * in a real JS private field, so it is absent from `console.log` and
   * `JSON.stringify` output. Note this option object itself is a plain object —
   * logging the config you pass in will still print the secret. Long-lived;
   * rotation is the caller's responsibility.
   */
  clientSecret: string
  /** Injectable clock for deterministic tests. Defaults to `Date.now`. */
  now?: () => number
}

/**
 * Owns the Palisade bearer-token lifecycle.
 *
 * Unlike Custody (challenge-response with a signed nonce), Palisade uses a
 * client-credentials exchange: resend `{ clientId, clientSecret }` and cache
 * the returned token until it nears expiry. There is no per-refresh signing —
 * the credentials themselves are the long-lived secret.
 *
 * - caches the token and refreshes before expiry (`expiresIn` minus a ~5-min
 *   safety buffer; ~10-min fallback if `expiresIn` is missing/invalid);
 * - collapses concurrent refreshes into a single in-flight request;
 * - supports one forced refresh-and-retry driven by an upstream 401.
 *
 * It does not make API calls itself — the transport layer asks it for a valid
 * token (`getToken`) and, on a 401, calls `forceRefresh()` exactly once.
 */
export class PalisadeAuthService {
  private readonly authPort: PalisadeAuthPort
  private readonly clientId: string
  private readonly now: () => number

  private tokenExpirationMs: number | null = null
  /** Shared in-flight refresh; concurrent callers await this one promise. */
  private refreshPromise: Promise<string> | null = null

  /**
   * The Palisade client secret. A real JS private field, not a TypeScript
   * `private`: the latter is erased at compile time, leaving an ordinary
   * enumerable property that `console.log`, `util.inspect`, and
   * `JSON.stringify` all print in the clear.
   */
  readonly #clientSecret: string

  /** Cached bearer token — `#`-private for the same reason as {@link #clientSecret}. */
  #accessToken: string | null = null

  /**
   * Construct a PalisadeAuthService.
   *
   * @param options - The auth port, client credentials, and optional clock.
   */
  public constructor(options: PalisadeAuthServiceOptions) {
    this.authPort = options.authPort
    this.clientId = options.clientId
    this.#clientSecret = options.clientSecret
    this.now = options.now ?? Date.now
  }

  /**
   * Return a valid bearer token, refreshing if missing/expired. Concurrent
   * callers share one refresh.
   *
   * @param forceRefresh - Discard the cached token and refresh (the 401 path).
   * @returns A valid bearer token.
   */
  public async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.#accessToken !== null && !this.isTokenExpired()) {
      return this.#accessToken
    }
    if (!forceRefresh && this.refreshPromise !== null) {
      return this.refreshPromise
    }

    const refreshPromise = this.refresh().finally(() => {
      if (this.refreshPromise === refreshPromise) {
        this.refreshPromise = null
      }
    })
    this.refreshPromise = refreshPromise
    return refreshPromise
  }

  /**
   * Force a token refresh. Intended for the single 401 refresh-and-retry;
   * shares the in-flight refresh if one is already running.
   *
   * @returns The newly issued token.
   */
  public async forceRefresh(): Promise<string> {
    return this.getToken(true)
  }

  /**
   * Report whether the cached token is missing or close to expiring.
   *
   * @returns `true` if there is no token, or it is within the safety buffer.
   */
  public isTokenExpired(): boolean {
    if (this.tokenExpirationMs === null) {
      return true
    }
    return this.now() > this.tokenExpirationMs - EXPIRY_SAFETY_BUFFER_MS
  }

  /**
   * Read the cached token without triggering a refresh.
   *
   * @returns The current cached token, or `null` if none is cached.
   */
  public getCurrentToken(): string | null {
    return this.#accessToken
  }

  /**
   * Exchange the client credentials for a bearer token and cache it.
   *
   * @returns The newly issued bearer token.
   */
  private async refresh(): Promise<string> {
    let response: { accessToken: string; expiresIn: number }
    try {
      response = await this.authPort.exchangeCredential(
        this.clientId,
        this.#clientSecret,
      )
    } catch (error) {
      // Never surface credential material; wrap transport/auth failures uniformly.
      throw new PalisadeAuthError('Palisade authentication failed', {
        cause: error,
      })
    }

    const token = response.accessToken
    if (token === '') {
      throw new PalisadeAuthError(
        'Palisade credential exchange returned no accessToken',
      )
    }

    this.#accessToken = token
    this.tokenExpirationMs = this.now() + validityMs(response.expiresIn)
    return token
  }
}
