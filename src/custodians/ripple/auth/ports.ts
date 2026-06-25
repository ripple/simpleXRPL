/**
 * Injected I/O ports for the Custody adapter (TDD §7.1).
 *
 * The auth layer never talks to a HTTP client directly: it depends on this narrow
 * interface so the auth state machine (single-flight refresh, 401-retry, token
 * lifecycle) is exercised offline with in-memory fakes. The HTTP-backed
 * implementation lives in the transport layer (DGE-7463); tests use a fake.
 *
 * The token endpoint is the separate Custody auth server (`auth.tokenUrl`,
 * TDD §3.3), not part of the Custody OpenAPI surface — so these are
 * hand-authored SDK-internal types with no generated counterpart, as CLAUDE.md
 * permits.
 */

/** The signed-challenge form fields Custody's token endpoint expects. */
export interface SignedChallenge {
  challenge: string
  publicKey: string
  signature: string
}

/** Result of exchanging a signed challenge for a JWT. */
export interface TokenResponse {
  /** The JWT bearer token. */
  access_token: string
}

/**
 * Port for the Custody token endpoint. The production implementation POSTs the
 * form-encoded challenge; the test fake returns a synthetic JWT.
 */
export interface CustodyAuthPort {
  /**
   * Exchange a signed challenge for a JWT.
   *
   * @param form - The signed challenge form.
   * @returns The token response.
   * @throws On transport/auth failure; the caller maps it to CustodyAuthError.
   */
  fetchToken: (form: SignedChallenge) => Promise<TokenResponse>
}
