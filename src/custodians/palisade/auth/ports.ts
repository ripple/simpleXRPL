/**
 * Injected auth I/O port for the Palisade adapter.
 *
 * Palisade authenticates via an OAuth2 client-credentials exchange —
 * `POST /v2/credentials/oauth/token` with `{ clientId, clientSecret }` returns
 * a short-lived bearer token (`CredentialService_ExchangeCredential` in the
 * generated spec). This is a hand-authored SDK-internal port (no generated
 * counterpart) so the token lifecycle is exercised offline with a fake, same
 * discipline as the Custody auth port.
 *
 * NOTE: the design's config table names this "PALISADE_API_KEY", but the actual
 * generated API is a client-credentials exchange, not a static API-key header.
 * This port and its HTTP-backed implementation follow the real spec.
 */

/** Result of exchanging client credentials for an access token. */
export interface PalisadeTokenResponse {
  /** The bearer access token. */
  accessToken: string
  /** Token lifetime in seconds, per `v2ExchangeCredentialResponse.expiresIn`. */
  expiresIn: number
}

/**
 * Port for the Palisade credential-exchange endpoint. The production
 * implementation POSTs the JSON client-credentials body; the test fake returns
 * a synthetic token.
 */
export interface PalisadeAuthPort {
  /**
   * Exchange client credentials for a bearer token.
   *
   * @param clientId - The Palisade client ID.
   * @param clientSecret - The Palisade client secret.
   * @returns The token response.
   * @throws On transport/auth failure; the caller maps it to PalisadeAuthError.
   */
  exchangeCredential: (
    clientId: string,
    clientSecret: string,
  ) => Promise<PalisadeTokenResponse>
}
