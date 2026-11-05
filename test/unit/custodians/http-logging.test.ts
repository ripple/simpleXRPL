import { withHttpLogging } from '../../../src/custodians/http-logging.js'
import type {
  CustodyHttpPort,
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'

/** One `debug` call. */
interface Entry {
  readonly message: string
  readonly fields: Record<string, unknown>
}

/**
 * A logger that records what it is given.
 *
 * @returns The logger and its entries.
 */
function recordingLogger(): {
  logger: { debug: (message: string, fields?: Record<string, unknown>) => void }
  entries: Entry[]
} {
  const entries: Entry[] = []
  return {
    entries,
    logger: {
      debug(message, fields = {}): void {
        entries.push({ message, fields })
      },
    },
  }
}

/**
 * A transport that always answers with `response`.
 *
 * @param response - The response.
 * @returns The transport.
 */
function answering(response: HttpResponse): CustodyHttpPort {
  return { send: async () => response }
}

/**
 * A clock that advances by `step` milliseconds on each read.
 *
 * @param step - The step.
 * @returns The clock.
 */
function steppingClock(step: number): () => number {
  let time = 0
  return (): number => {
    time += step
    return time
  }
}

const GET: HttpRequest = {
  method: 'GET',
  url: 'https://custody.example.com/v1/me',
  headers: { Authorization: 'Bearer eyJhbGciOi.secret-jwt.sig' },
}

const OPTIONS = {
  custodian: 'ripple-custody',
  label: 'Ripple Custody',
  now: steppingClock(42),
}

describe('withHttpLogging', () => {
  it.each([undefined, false])(
    'returns the transport itself when debug is %p',
    (debug) => {
      const port = answering({ status: 200, body: '' })
      expect(withHttpLogging(port, debug, OPTIONS)).toBe(port)
    },
  )

  it('logs the method, URL, status, and duration', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({ status: 200, body: '{"id":"u1"}' }),
      logger,
      OPTIONS,
    )

    const response = await port.send(GET)

    expect(response).toEqual({ status: 200, body: '{"id":"u1"}' })
    expect(entries).toEqual([
      {
        message:
          'Ripple Custody GET https://custody.example.com/v1/me → 200 (42 ms)',
        fields: {
          custodian: 'ripple-custody',
          method: 'GET',
          url: 'https://custody.example.com/v1/me',
          requestHeaders: { Authorization: 'Bearer [REDACTED]' },
          status: 200,
          durationMs: 42,
          responseBody: '{"id":"u1"}',
        },
      },
    ])
  })

  it('masks an Authorization header with no scheme, and cookies', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({ status: 200, body: '' }),
      logger,
      OPTIONS,
    )

    await port.send({
      ...GET,
      headers: { authorization: 'raw-key', Cookie: 'session=abc' },
    })

    expect(entries[0]?.fields.requestHeaders).toEqual({
      authorization: '[REDACTED]',
      Cookie: '[REDACTED]',
    })
  })

  it('masks tokens and client secrets in JSON bodies, at any depth', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({
        status: 200,
        body: JSON.stringify({
          access_token: 'at',
          id_token: 'it',
          refresh_token: 'rt',
          expires_in: 300,
        }),
      }),
      logger,
      OPTIONS,
    )

    await port.send({
      method: 'POST',
      url: 'https://palisade.example/v2/credentials/oauth/token',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'id',
        clientSecret: 'shh',
        nested: [{ accessToken: 'at2', keep: true }],
      }),
    })

    expect(entries[0]?.fields).toMatchObject({
      requestBody: JSON.stringify({
        clientId: 'id',
        clientSecret: '[REDACTED]',
        nested: [{ accessToken: '[REDACTED]', keep: true }],
      }),
      responseBody: JSON.stringify({
        access_token: '[REDACTED]',
        id_token: '[REDACTED]',
        refresh_token: '[REDACTED]',
        expires_in: 300,
      }),
    })
  })

  it('masks secrets in a form-encoded body and in the query', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({ status: 200, body: 'not json' }),
      logger,
      OPTIONS,
    )

    await port.send({
      method: 'POST',
      url: 'https://auth.example.com/token?access_token=at&x=1',
      headers: {},
      body: 'grant_type=client_credentials&client_secret=shh',
    })

    expect(entries[0]?.fields).toMatchObject({
      url: 'https://auth.example.com/token?access_token=%5BREDACTED%5D&x=1',
      requestBody: 'grant_type=client_credentials&client_secret=%5BREDACTED%5D',
      responseBody: 'not json',
    })
  })

  it('masks the signed challenge in a Custody token request', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({ status: 200, body: '{"access_token":"jwt"}' }),
      logger,
      OPTIONS,
    )

    // The form HttpCustodyAuthPort sends: the SDK picks the challenge, so the
    // challenge + signature pair is exchangeable for a token.
    await port.send({
      method: 'POST',
      url: 'https://auth.example.com/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'customer_api',
        signature: 'MEUCIQDsigned',
        challenge: '738d4753-1f2e-4c3d-9b8a-112233445566',
        public_key: 'MCowBQYDK2VwAyEA',
      }).toString(),
    })

    const logged = JSON.stringify(entries)
    expect(logged).not.toContain('MEUCIQDsigned')
    expect(logged).not.toContain('738d4753')
    expect(logged).not.toContain('"jwt"')
    expect(entries[0]?.fields.requestBody).toBe(
      'grant_type=password&client_id=customer_api&signature=%5BREDACTED%5D' +
        '&challenge=%5BREDACTED%5D&public_key=MCowBQYDK2VwAyEA',
    )
  })

  it('masks other secrets an api.call body can carry', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({
        status: 200,
        body: JSON.stringify({ backup: { encryptedSeed: 'seed-bytes' } }),
      }),
      logger,
      OPTIONS,
    )

    await port.send({
      ...GET,
      method: 'POST',
      body: JSON.stringify({
        credential: { apiKey: 'k', secret: 's3cret', password: 'pw' },
      }),
    })

    const logged = JSON.stringify(entries)
    for (const value of ['seed-bytes', 's3cret', '"pw"']) {
      expect(logged).not.toContain(value)
    }
  })

  it('cuts a long body', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      answering({ status: 200, body: 'x'.repeat(10_000) }),
      logger,
      OPTIONS,
    )

    await port.send(GET)

    expect(entries[0]?.fields.responseBody).toBe(
      `${'x'.repeat(8192)}… (1808 more characters)`,
    )
  })

  it('logs a failed request, then rethrows it unchanged', async () => {
    const { logger, entries } = recordingLogger()
    const failure = new Error('The operation was aborted due to timeout')
    const port = withHttpLogging(
      {
        async send(): Promise<never> {
          throw failure
        },
      },
      logger,
      OPTIONS,
    )

    await expect(port.send(GET)).rejects.toBe(failure)
    expect(entries[0]).toMatchObject({
      message:
        'Ripple Custody GET https://custody.example.com/v1/me failed (42 ms): The operation was aborted due to timeout',
      fields: { durationMs: 42, error: failure.message },
    })
    expect(entries[0]?.fields).not.toHaveProperty('status')
  })

  it('logs a non-Error rejection as text', async () => {
    const { logger, entries } = recordingLogger()
    const port = withHttpLogging(
      {
        async send(): Promise<never> {
          // eslint-disable-next-line no-throw-literal, @typescript-eslint/only-throw-error -- transports may reject with anything
          throw 'socket hang up'
        },
      },
      logger,
      OPTIONS,
    )

    await expect(port.send(GET)).rejects.toBe('socket hang up')
    expect(entries[0]?.fields.error).toBe('socket hang up')
  })

  it('ignores a logger that throws', async () => {
    const port = withHttpLogging(
      answering({ status: 204, body: '' }),
      {
        debug(): void {
          throw new Error('log sink down')
        },
      },
      OPTIONS,
    )

    await expect(port.send(GET)).resolves.toEqual({ status: 204, body: '' })
  })

  it('logs to console.debug when debug is true', async () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {
      // silenced
    })
    try {
      const port = withHttpLogging(answering({ status: 200, body: '' }), true, {
        custodian: 'palisade-custody',
        label: 'Palisade',
      })

      await port.send(GET)

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Palisade GET https:\/\/custody\.example\.com\/v1\/me → 200 \(\d+ ms\)$/u,
        ),
        expect.objectContaining({ custodian: 'palisade-custody' }),
      )
    } finally {
      spy.mockRestore()
    }
  })
})
