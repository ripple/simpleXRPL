/**
 * Low-level HTTP I/O port for the Custody transport (TDD §7.1).
 *
 * Both the authenticated API client and the token-endpoint auth port talk to
 * this single narrow interface, so the whole transport — including the
 * 401-retry state machine — is exercised offline with an in-memory fake.
 */

/** A raw HTTP request. `body` is already serialized (JSON or form-encoded). */
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
export interface CustodyHttpPort {
  send: (request: HttpRequest) => Promise<HttpResponse>
}
