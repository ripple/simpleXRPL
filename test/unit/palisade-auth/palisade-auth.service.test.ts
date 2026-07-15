import { PalisadeAuthService } from '../../../src/custodians/palisade/auth/palisade-auth.service.js'
import { PalisadeAuthError } from '../../../src/errors.js'

import { FakeAuthPort } from './test-utils.js'

const CLIENT_ID = 'client-1'
const CLIENT_SECRET = 'secret-1'
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

describe('PalisadeAuthService token lifecycle', () => {
  it('fetches once then serves the cached token while valid', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort({ accessToken: 't1', expiresIn: ONE_HOUR_S })
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      now: clock.now,
    })

    const first = await auth.getToken()
    const second = await auth.getToken()

    expect(first).toBe(second)
    expect(port.calls).toHaveLength(1)
  })

  it('collapses concurrent refreshes into a single request (single-flight)', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort({ accessToken: 't1', expiresIn: ONE_HOUR_S })
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
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
    const port = new FakeAuthPort({ accessToken: 't1', expiresIn: TEN_MIN_S })
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      now: clock.now,
    })

    await auth.getToken()
    expect(port.calls).toHaveLength(1)

    // Advance to within the 5-min buffer (10 min - 6 min = 4 min left).
    clock.advance(6 * 60 * 1000)
    port.queueTokens({ accessToken: 't2', expiresIn: ONE_HOUR_S })
    await auth.getToken()

    expect(port.calls).toHaveLength(2)
  })

  it('forceRefresh re-exchanges credentials and fetches a new token', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort({ accessToken: 't1', expiresIn: ONE_HOUR_S })
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      now: clock.now,
    })

    await auth.getToken()
    port.queueTokens({ accessToken: 't2', expiresIn: ONE_HOUR_S })
    const refreshed = await auth.forceRefresh()

    expect(refreshed).toBe('t2')
    expect(port.calls).toHaveLength(2)
    expect(port.calls[0]).toEqual({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    })
  })

  it('falls back to a short default validity when expiresIn is missing/invalid', async () => {
    const clock = fakeClock(START_MS)
    const port = new FakeAuthPort({ accessToken: 't1', expiresIn: 0 })
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      now: clock.now,
    })

    await auth.getToken()
    // Just under the ~10-min fallback minus buffer, still valid.
    clock.advance(2 * 60 * 1000)
    await auth.getToken()
    expect(port.calls).toHaveLength(1)

    // Past the fallback window it refreshes.
    clock.advance(10 * 60 * 1000)
    port.queueTokens({ accessToken: 't2', expiresIn: ONE_HOUR_S })
    await auth.getToken()
    expect(port.calls).toHaveLength(2)
  })
})

describe('PalisadeAuthService error mapping', () => {
  it('wraps transport failures as PalisadeAuthError', async () => {
    const port = new FakeAuthPort({
      accessToken: 'unused',
      expiresIn: ONE_HOUR_S,
    })
    port.failOnce()
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    })
    await expect(auth.getToken()).rejects.toBeInstanceOf(PalisadeAuthError)
  })

  it('throws when the endpoint returns no accessToken', async () => {
    const port = new FakeAuthPort({ accessToken: '', expiresIn: ONE_HOUR_S })
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    })
    await expect(auth.getToken()).rejects.toThrow(/no accessToken/u)
  })

  it('clears the in-flight promise after a failure so the next call retries', async () => {
    const port = new FakeAuthPort({ accessToken: 't1', expiresIn: ONE_HOUR_S })
    port.failOnce()
    const auth = new PalisadeAuthService({
      authPort: port,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    })

    await expect(auth.getToken()).rejects.toBeInstanceOf(PalisadeAuthError)
    await expect(auth.getToken()).resolves.toBeTruthy()
    expect(port.calls).toHaveLength(2)
  })
})
