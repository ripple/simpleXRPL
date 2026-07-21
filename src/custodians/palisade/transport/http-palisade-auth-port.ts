import { PalisadeAuthError } from '../../../errors.js'
import type { PalisadeAuthPort, PalisadeTokenResponse } from '../auth/ports.js'

import type { PalisadeHttpPort } from './http-port.js'

const HTTP_ERROR_THRESHOLD = 400

/** Construction options for {@link HttpPalisadeAuthPort}. */
export interface HttpPalisadeAuthPortOptions {
  /** Palisade base URL (must be HTTPS). */
  baseUrl: string
  /** Injected transport. */
  http: PalisadeHttpPort
}

/**
 * Production {@link PalisadeAuthPort}: exchanges client credentials for a
 * bearer token via `POST /v2/credentials/oauth/token`
 * (`CredentialService_ExchangeCredential` in the generated spec).
 */
export class HttpPalisadeAuthPort implements PalisadeAuthPort {
  private readonly tokenUrl: string
  private readonly http: PalisadeHttpPort

  /**
   * Construct an HttpPalisadeAuthPort.
   *
   * @param options - Palisade base URL and transport port.
   * @throws {@link PalisadeAuthError} if the base URL is not HTTPS.
   */
  public constructor(options: HttpPalisadeAuthPortOptions) {
    if (!options.baseUrl.startsWith('https://')) {
      throw new PalisadeAuthError(
        `Palisade base URL must be HTTPS, got '${options.baseUrl}'`,
      )
    }
    this.tokenUrl = `${options.baseUrl.replace(/\/+$/u, '')}/v2/credentials/oauth/token`
    this.http = options.http
  }

  /**
   * Exchange client credentials for a bearer token.
   *
   * @param clientId - The Palisade client ID.
   * @param clientSecret - The Palisade client secret.
   * @returns The token response.
   * @throws {@link PalisadeAuthError} on a non-2xx response or a missing token.
   */
  public async exchangeCredential(
    clientId: string,
    clientSecret: string,
  ): Promise<PalisadeTokenResponse> {
    const response = await this.http.send({
      method: 'POST',
      url: this.tokenUrl,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    })

    if (response.status >= HTTP_ERROR_THRESHOLD) {
      throw new PalisadeAuthError(
        `Palisade credential exchange failed (status ${response.status})`,
      )
    }

    const parsed = parseTokenResponse(response.body)
    if (parsed === undefined) {
      throw new PalisadeAuthError(
        'Palisade credential exchange response had no accessToken',
      )
    }
    return parsed
  }
}

/**
 * Extract `{ accessToken, expiresIn }` from an exchange-endpoint JSON body.
 *
 * @param body - The raw token-endpoint response text.
 * @returns The parsed token response, or `undefined` if absent/unparseable.
 */
function parseTokenResponse(body: string): PalisadeTokenResponse | undefined {
  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'accessToken' in parsed &&
      typeof parsed.accessToken === 'string' &&
      'expiresIn' in parsed &&
      typeof parsed.expiresIn === 'number'
    ) {
      return { accessToken: parsed.accessToken, expiresIn: parsed.expiresIn }
    }
    return undefined
  } catch {
    return undefined
  }
}
