/**
 * Low-level HTTP I/O port for the Palisade transport (TDD §7.1).
 *
 * Both the authenticated API client and the credential-exchange auth port talk
 * to this single narrow interface, so the whole transport — including the
 * 401-retry state machine — is exercised offline with an in-memory fake.
 * Mirrors the Ripple adapter's port shape; kept separate per-adapter rather
 * than shared, consistent with each custodian adapter owning its own injected
 * I/O ports.
 */

/** A raw HTTP request. `body` is already serialized (JSON). */
export interface HttpRequest {
  method: 'GET' | 'POST'
  url: string
  headers: Record<string, string>
  body?: string
}

/** A raw HTTP response; `body` is the undecoded response text. */
export interface HttpResponse {
  status: number
  body: string
}

/** The injected transport. Production uses `fetch`; tests use an in-memory fake. */
export interface PalisadeHttpPort {
  send: (request: HttpRequest) => Promise<HttpResponse>
}
