import { randomUUID } from 'node:crypto'

import { CustodyAuthError } from '../../../errors.js'

import { LocalKeySigner } from './key-signer.js'
import type { CustodyKeySigner } from './key-signer.js'
import type { CustodyAuthPort, SignedChallenge } from './ports.js'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const SAFETY_BUFFER_MINUTES = 5
const DEFAULT_VALIDITY_MINUTES = 10

/** Treat the token as expired this long before its real exp (~5 min). */
const EXPIRY_SAFETY_BUFFER_MS =
  SAFETY_BUFFER_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND
/**
 * Fallback validity when the JWT carries no parseable `exp`. Kept short and
 * safety-first: an absent `exp` means the real lifetime is unknown, so it's
 * better to refresh too often than to sit on a token that may already be
 * dead server-side.
 */
const DEFAULT_TOKEN_VALIDITY_MS =
  DEFAULT_VALIDITY_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND

/** The index of the payload segment in a `header.payload.signature` JWT. */
const JWT_PAYLOAD_INDEX = 1

/**
 * Parse the `exp` (seconds) claim from a JWT payload.
 *
 * @param token - The JWT.
 * @returns The `exp` value in seconds, or `null` if unparseable.
 */
function extractExpFromJwt(token: string): number | null {
  try {
    const payload = token.split('.')[JWT_PAYLOAD_INDEX]
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    )
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'exp' in decoded &&
      typeof decoded.exp === 'number'
    ) {
      return decoded.exp
    }
    return null
  } catch {
    return null
  }
}

/** Construction options for {@link CustodyAuthService}. */
export type CustodyAuthServiceOptions = {
  /** Token endpoint port (HTTP in production, in-memory fake in tests). */
  authPort: CustodyAuthPort
  /** Injectable clock for deterministic tests. Defaults to `Date.now`. */
  now?: () => number
} & (
  | {
      /**
       * Intent-author private key (PEM). Never logged or persisted: it is
       * held in a real JS private field, so it is absent from `console.log`
       * and `JSON.stringify` output. Note this option object itself is a
       * plain object — logging the options you pass in will still print it.
       */
      privateKey: string
      keySigner?: never
    }
  | {
      /** The API user key, however it is held (in process, HSM or KMS). */
      keySigner: CustodyKeySigner
      privateKey?: never
    }
)

/**
 * Owns the Custody JWT lifecycle:
 *
 * - obtains a token by challenge-response: sign a one-time nonce with the
 *   intent-author key, exchange it for a JWT;
 * - caches the JWT and refreshes before expiry (exp minus a ~5-min buffer,
 *   ~10-min fallback if exp is missing);
 * - collapses concurrent refreshes into a single in-flight request;
 * - signs a FRESH challenge on every refresh (no nonce reuse);
 * - supports one forced refresh-and-retry driven by an upstream 401.
 *
 * It does not make API calls itself — the transport layer asks it for a valid
 * token (`getToken`) and, on a 401, calls `forceRefresh()` exactly once.
 */
export class CustodyAuthService {
  private readonly authPort: CustodyAuthPort
  private readonly keySigner: CustodyKeySigner
  private readonly now: () => number

  private tokenExpirationMs: number | null = null
  /** Shared in-flight refresh; concurrent callers await this one promise. */
  private refreshPromise: Promise<string> | null = null

  /**
   * Cached bearer token. A real JS private field, not a TypeScript `private`:
   * the latter is erased at compile time, leaving an ordinary enumerable
   * property that `console.log`, `util.inspect`, and `JSON.stringify` all
   * print in the clear. `#`-fields are unreachable at runtime and skipped by
   * every one of those.
   */
  #accessToken: string | null = null

  /**
   * Construct a CustodyAuthService.
   *
   * @param options - The auth port, the key (PEM or key signer), and an
   *   optional clock.
   */
  public constructor(options: CustodyAuthServiceOptions) {
    this.authPort = options.authPort
    this.now = options.now ?? Date.now
    // With a PEM key the public key is derived from it, never supplied, so a
    // rotation can't update one half and not the other. An HSM/KMS signer's
    // public key is checked against every signature it returns instead.
    this.keySigner =
      options.keySigner ?? LocalKeySigner.fromPrivateKey(options.privateKey)
  }

  /**
   * Return a valid JWT, refreshing if missing/expired. Concurrent callers share
   * one refresh.
   *
   * @param forceRefresh - Discard the cached token and refresh (the 401 path).
   * @returns A valid JWT bearer token.
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
   * Force a token refresh. Intended for the single 401 refresh-and-retry; shares
   * the in-flight refresh if one is already running.
   *
   * @returns The newly issued JWT.
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
   * Sign a fresh challenge, exchange it for a JWT, and cache it.
   *
   * @returns The newly issued JWT.
   */
  private async refresh(): Promise<string> {
    const signed = await this.signFreshChallenge()
    let response: { access_token: string }
    try {
      response = await this.authPort.fetchToken(signed)
    } catch (error) {
      // Never surface key material; wrap transport/auth failures uniformly.
      throw new CustodyAuthError('Custody authentication failed', {
        cause: error,
      })
    }

    const token = response.access_token
    if (!token) {
      throw new CustodyAuthError(
        'Custody token endpoint returned no access_token',
      )
    }

    this.#accessToken = token
    const exp = extractExpFromJwt(token)
    this.tokenExpirationMs =
      exp === null
        ? this.now() + DEFAULT_TOKEN_VALIDITY_MS
        : exp * MS_PER_SECOND
    return token
  }

  /**
   * Generate a new nonce and sign it (fresh per refresh — avoids reuse).
   *
   * @returns The signed challenge form to send to the token endpoint.
   */
  private async signFreshChallenge(): Promise<SignedChallenge> {
    const challenge = randomUUID()
    const signature = await this.keySigner.sign(challenge, 'auth-challenge')
    return {
      challenge,
      publicKey: this.keySigner.publicKeyBase64,
      signature,
    }
  }
}
