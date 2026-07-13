import { CustodyAuthError } from '../../../src/errors.js'
import { HttpCustodyAuthPort } from '../../../src/custodians/ripple/transport/http-custody-auth-port.js'

import { FakeHttpPort, ok, status } from './test-utils.js'

const TOKEN_URL = 'https://auth.example.com/token'
const CHALLENGE = {
  challenge: 'nonce-1',
  publicKey: 'pubkey-b64',
  signature: 'sig-b64',
}

describe('HttpCustodyAuthPort', () => {
  it('rejects a non-HTTPS token URL', () => {
    const http = new FakeHttpPort(() => ok({}))
    expect(
      () => new HttpCustodyAuthPort({ tokenUrl: 'http://insecure', http }),
    ).toThrow(CustodyAuthError)
  })

  it('POSTs the form-encoded password grant and returns the token', async () => {
    const http = new FakeHttpPort(() => ok({ access_token: 'jwt-123' }))
    const port = new HttpCustodyAuthPort({ tokenUrl: TOKEN_URL, http })

    const result = await port.fetchToken(CHALLENGE)

    expect(result).toEqual({ access_token: 'jwt-123' })
    const [request] = http.requests
    expect(request.method).toBe('POST')
    expect(request.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    const form = new URLSearchParams(request.body)
    expect(form.get('grant_type')).toBe('password')
    expect(form.get('client_id')).toBe('customer_api')
    expect(form.get('challenge')).toBe('nonce-1')
    expect(form.get('public_key')).toBe('pubkey-b64')
    expect(form.get('signature')).toBe('sig-b64')
  })

  it('throws CustodyAuthError on a non-2xx response', async () => {
    const http = new FakeHttpPort(() => status(401, { error: 'bad' }))
    const port = new HttpCustodyAuthPort({ tokenUrl: TOKEN_URL, http })
    await expect(port.fetchToken(CHALLENGE)).rejects.toBeInstanceOf(
      CustodyAuthError,
    )
  })

  it('throws when the response has no access_token', async () => {
    const http = new FakeHttpPort(() => ok({ token_type: 'Bearer' }))
    const port = new HttpCustodyAuthPort({ tokenUrl: TOKEN_URL, http })
    await expect(port.fetchToken(CHALLENGE)).rejects.toThrow(/no access_token/u)
  })
})
