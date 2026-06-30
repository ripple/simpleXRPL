import type { CustodyHttpPort, HttpRequest, HttpResponse } from './http-port.js'

/**
 * Production {@link CustodyHttpPort} backed by the global `fetch` (Node ≥18).
 * Node-only; the SDK does not target browsers (see CLAUDE.md).
 */
export class FetchHttpPort implements CustodyHttpPort {
  /**
   * Perform the HTTP request via global `fetch`.
   *
   * @param request - The raw HTTP request.
   * @returns The raw HTTP response (status + undecoded text).
   */
  // eslint-disable-next-line class-methods-use-this -- Stateless adapter over global fetch.
  public async send(request: HttpRequest): Promise<HttpResponse> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })
    return { status: response.status, body: await response.text() }
  }
}
