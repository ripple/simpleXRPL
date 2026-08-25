import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import type {
  CustodyAuthPort,
  TokenResponse,
} from '../../../src/custodians/ripple/auth/ports.js'
import { CustodyAuthError } from '../../../src/errors.js'

import { FakeAuthPort, generateTestKey, makeJwt } from './test-utils.js'

const KEY = generateTestKey('ed25519')
const START_MS = 1_000_000
const ONE_HOUR_S = 3600
const TEN_MIN_S = 600

/**
 * A controllable clock starting at a fixed epoch.
 *
 * @param startMs - The initial epoch milliseconds.
 * @returns A clock with `now()` and `advance(ms)`.
 */
function fakeClock(startMs: number): {
  now: () => number
  advance: (ms: number) => void
} {
  let time = startMs
  return {
    now(): number {
      return time
    },
    advance(ms: number): void {
      time += ms
    },
  }
}

/**
 * Build a JWT that expires a given number of seconds after a clock value.
 *
 * @param clockMs - The current clock value in milliseconds.
 * @param secondsFromNow - Seconds until the token's `exp`.
 * @returns A JWT string carrying the computed `exp`.
 */
function jwtExpiringIn(clockMs: number, secondsFromNow: number): string {
  return makeJwt({ exp: Math.floor(clockMs / 1000) + secondsFromNow })
}

describe('CustodyAuthService token lifecycle', () => {
  it('derives the public key from the private key', () => {
    expect(
      () =>
        new CustodyAuthService({
          authPort: new FakeAuthPort('t'),
          privateKey: KEY,
        }),
    ).not.toThrow()
  })

  it('fetches once then serves the cached token while valid', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort(jwtExpiringIn(clock.now(), ONE_HOUR_S))
    const auth = new CustodyAuthService({
      authPort: port,
      privateKey: KEY,
      now: clock.now,
    })

    const first = await auth.getToken()
    const second = await auth.getToken()

    expect(first).toBe(second)
    expect(port.calls).toHaveLength(1)
  })

  it('collapses concurrent refreshes into a single request (single-flight)', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort(jwtExpiringIn(clock.now(), ONE_HOUR_S))
    const auth = new CustodyAuthService({
      authPort: port,
      privateKey: KEY,
      now: clock.now,
    })

    const results = await Promise.all([
      auth.getToken(),
      auth.getToken(),
      auth.getToken(),
    ])

    expect(new Set(results).size).toBe(1)
    expect(port.calls).toHaveLength(1)
  })

  it('refreshes once the token enters the 5-minute safety buffer', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort(jwtExpiringIn(clock.now(), TEN_MIN_S))
    const auth = new CustodyAuthService({
      authPort: port,
      privateKey: KEY,
      now: clock.now,
    })

    await auth.getToken()
    expect(port.calls).toHaveLength(1)

    // Advance to within the 5-min buffer (10 min - 6 min = 4 min left).
    clock.advance(6 * 60 * 1000)
    port.queueTokens(jwtExpiringIn(clock.now(), ONE_HOUR_S))
    await auth.getToken()

    expect(port.calls).toHaveLength(2)
  })

  it('forceRefresh signs a fresh challenge and fetches a new token', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort(jwtExpiringIn(clock.now(), ONE_HOUR_S))
    const auth = new CustodyAuthService({
      authPort: port,
      privateKey: KEY,
      now: clock.now,
    })

    await auth.getToken()
    port.queueTokens(jwtExpiringIn(clock.now(), ONE_HOUR_S))
    await auth.forceRefresh()

    expect(port.calls).toHaveLength(2)
    // Each refresh must use a distinct nonce (no stale-challenge reuse).
    expect(port.calls[0]?.challenge).not.toBe(port.calls[1]?.challenge)
    expect(port.calls[0]?.signature).not.toBe(port.calls[1]?.signature)
  })

  it('forceRefresh mints its own challenge even if a normal refresh is in-flight', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort(jwtExpiringIn(clock.now(), TEN_MIN_S))
    const auth = new CustodyAuthService({
      authPort: port,
      privateKey: KEY,
      now: clock.now,
    })

    await auth.getToken()
    // Enter the safety buffer so a plain getToken() call proactively refreshes.
    clock.advance(6 * 60 * 1000)
    port.queueTokens(
      jwtExpiringIn(clock.now(), ONE_HOUR_S),
      jwtExpiringIn(clock.now(), ONE_HOUR_S),
    )

    await Promise.all([auth.getToken(), auth.forceRefresh()])

    // Initial fetch, the proactive refresh, and the forced refresh: 3 total.
    expect(port.calls).toHaveLength(3)
  })

  it('falls back to a short default validity when the JWT has no exp claim', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort(makeJwt({ sub: 'no-exp' }))
    const auth = new CustodyAuthService({
      authPort: port,
      privateKey: KEY,
      now: clock.now,
    })

    await auth.getToken()
    // Just under the fallback-minus-buffer window it is still valid.
    clock.advance(4 * 60 * 1000)
    await auth.getToken()
    expect(port.calls).toHaveLength(1)

    // Past the fallback-minus-buffer window it refreshes.
    clock.advance(2 * 60 * 1000)
    port.queueTokens(makeJwt({ sub: 'again' }))
    await auth.getToken()
    expect(port.calls).toHaveLength(2)
  })

  it('includes the derived public key in the challenge form', async () => {
    const port = new FakeAuthPort(makeJwt({ exp: 9_999_999_999 }))
    const auth = new CustodyAuthService({ authPort: port, privateKey: KEY })
    await auth.getToken()
    expect(port.calls[0]?.publicKey).toBeTruthy()
  })
})

describe('CustodyAuthService error mapping', () => {
  it('wraps transport failures as CustodyAuthError', async () => {
    const port = new FakeAuthPort('unused')
    port.failOnce()
    const auth = new CustodyAuthService({ authPort: port, privateKey: KEY })
    await expect(auth.getToken()).rejects.toBeInstanceOf(CustodyAuthError)
  })

  it('throws when the endpoint returns no access_token', async () => {
    const port = new FakeAuthPort('')
    const auth = new CustodyAuthService({ authPort: port, privateKey: KEY })
    await expect(auth.getToken()).rejects.toThrow(/no access_token/u)
  })

  it('throws when the endpoint response omits access_token entirely', async () => {
    const port: CustodyAuthPort = {
      fetchToken: async () =>
        ({ access_token: undefined }) as unknown as TokenResponse,
    }
    const auth = new CustodyAuthService({ authPort: port, privateKey: KEY })
    await expect(auth.getToken()).rejects.toThrow(/no access_token/u)
  })

  it('clears the in-flight promise after a failure so the next call retries', async () => {
    const port = new FakeAuthPort(makeJwt({ exp: 9_999_999_999 }))
    port.failOnce()
    const auth = new CustodyAuthService({ authPort: port, privateKey: KEY })

    await expect(auth.getToken()).rejects.toBeInstanceOf(CustodyAuthError)
    await expect(auth.getToken()).resolves.toBeTruthy()
    expect(port.calls).toHaveLength(2)
  })
})
