import { CustodyAuthError } from '../../../errors.js'
import type {
  CustodyAuthPort,
  SignedChallenge,
  TokenResponse,
} from '../auth/ports.js'

import type { CustodyHttpPort } from './http-port.js'

const HTTP_ERROR_THRESHOLD = 400
// Custody's token endpoint uses the OAuth password grant (custody.js auth.service).
const GRANT_TYPE = 'password'
/**
 * Default OIDC client id. Per the Custody auth docs, `client_id` identifies
 * the caller's registered Keycloak client and is deployment-specific — this
 * is only a fallback for deployments that haven't registered their own.
 */
const DEFAULT_CLIENT_ID = 'customer_api'

/** Construction options for {@link HttpCustodyAuthPort}. */
export interface HttpCustodyAuthPortOptions {
  /** The Custody auth token endpoint URL (must be HTTPS). */
  tokenUrl: string
  /** Injected transport. */
  http: CustodyHttpPort
  /** The OIDC client id to authenticate as. Defaults to `'customer_api'`. */
  clientId?: string
}

/**
 * Production {@link CustodyAuthPort} (DGE-7462): exchanges a signed challenge for
 * a JWT by POSTing the form-encoded password grant to the Custody auth server.
 */
export class HttpCustodyAuthPort implements CustodyAuthPort {
  private readonly tokenUrl: string
  private readonly http: CustodyHttpPort
  private readonly clientId: string

  /**
   * Construct an HttpCustodyAuthPort.
   *
   * @param options - Token endpoint URL, transport port, and optional client id.
   * @throws {@link CustodyAuthError} if the token URL is not HTTPS.
   */
  public constructor(options: HttpCustodyAuthPortOptions) {
    if (!options.tokenUrl.startsWith('https://')) {
      throw new CustodyAuthError(
        `Custody token URL must be HTTPS, got '${options.tokenUrl}'`,
      )
    }
    this.tokenUrl = options.tokenUrl
    this.http = options.http
    this.clientId = options.clientId ?? DEFAULT_CLIENT_ID
  }

  /**
   * Exchange a signed challenge for a JWT.
   *
   * @param form - The signed challenge form.
   * @returns The token response carrying the JWT.
   * @throws {@link CustodyAuthError} on a non-2xx response or a missing token.
   */
  public async fetchToken(form: SignedChallenge): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: GRANT_TYPE,
      client_id: this.clientId,
      signature: form.signature,
      challenge: form.challenge,
      public_key: form.publicKey,
    })

    const response = await this.http.send({
      method: 'POST',
      url: this.tokenUrl,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (response.status >= HTTP_ERROR_THRESHOLD) {
      throw new CustodyAuthError(
        `Custody token request failed (status ${response.status})`,
      )
    }

    const token = parseAccessToken(response.body)
    if (token === undefined) {
      throw new CustodyAuthError('Custody token response had no access_token')
    }
    return { access_token: token }
  }
}

/**
 * Extract `access_token` from a token-endpoint JSON body.
 *
 * @param body - The raw token-endpoint response text.
 * @returns The token string, or `undefined` if absent/unparseable.
 */
function parseAccessToken(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'access_token' in parsed &&
      typeof parsed.access_token === 'string'
    ) {
      return parsed.access_token
    }
    return undefined
  } catch {
    return undefined
  }
}
