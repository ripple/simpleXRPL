import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import { resolveFromEnvOptions } from '../../../src/custodians/ripple/construction.js'
import { SimpleXRPLError } from '../../../src/errors.js'
import { generateTestKey } from '../custody-auth/test-utils.js'

const send = jest.fn()

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({ send })),
  GetSecretValueCommand: jest.fn().mockImplementation((input: unknown) => ({
    input,
  })),
}))

const SIGNING_KEY_PEM = generateTestKey('ed25519')
const SECRET_ARN =
  'arn:aws:secretsmanager:us-east-1:123456789012:secret:custody/signing-key'
const SECRET_JSON = {
  public_key: 'base64-spki-public-key',
  private_key: SIGNING_KEY_PEM,
  user_alias: 'custody-author-1',
}

function envWith(signingKey: string): Record<string, string | undefined> {
  return {
    RIPPLE_CUSTODY_GATEWAY_URL: 'https://gateway.example.com',
    RIPPLE_CUSTODY_AUTH_SIGNING_KEY: signingKey,
    RIPPLE_CUSTODY_AUTH_TOKEN_URL: 'https://auth.example.com/token',
    RIPPLE_CUSTODY_DOMAIN_ID: 'domain-1',
  }
}

describe('resolveFromEnvOptions', () => {
  afterEach(() => {
    send.mockReset()
  })

  it('resolves a literal PEM signing key unchanged', async () => {
    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(SIGNING_KEY_PEM),
    })
    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
    expect(options.auth.clientId).toBeUndefined()
    expect(send).not.toHaveBeenCalled()
  })

  it('restores a PEM whose newlines were escaped in transit', async () => {
    // How a multi-line PEM most often arrives from a GitHub Actions secret or a
    // .env file. Left alone it fails to parse, and the resulting error blames
    // the key's algorithm rather than its formatting.
    const escaped = SIGNING_KEY_PEM.replace(/\n/gu, String.raw`\n`)
    expect(escaped).not.toBe(SIGNING_KEY_PEM)

    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(escaped),
    })

    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
    expect(KeypairService.detectKeyType(options.auth.signingKey)).toBe(
      'ed25519',
    )
  })

  it('restores a PEM whose newlines were escaped as CRLF', async () => {
    const escaped = SIGNING_KEY_PEM.replace(/\n/gu, String.raw`\r\n`)
    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(escaped),
    })
    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
  })

  it('strips wrapping quotes so a quoted PEM is not mistaken for a file path', async () => {
    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(`"${SIGNING_KEY_PEM}"`),
    })
    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
  })

  it('strips wrapping quotes from a Secrets Manager ARN', async () => {
    send.mockResolvedValueOnce({ SecretString: JSON.stringify(SECRET_JSON) })
    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(`'${SECRET_ARN}'`),
    })
    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('restores escaped newlines in a PEM stored in a Secrets Manager secret', async () => {
    send.mockResolvedValueOnce({
      SecretString: JSON.stringify({
        ...SECRET_JSON,
        private_key: SIGNING_KEY_PEM.replace(/\n/gu, String.raw`\n`),
      }),
    })
    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(SECRET_ARN),
    })
    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
  })

  it('reads an explicit RIPPLE_CUSTODY_AUTH_CLIENT_ID', async () => {
    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: {
        ...envWith(SIGNING_KEY_PEM),
        RIPPLE_CUSTODY_AUTH_CLIENT_ID: 'my-custom-client',
      },
    })
    expect(options.auth.clientId).toBe('my-custom-client')
  })

  it('fetches and parses the signing key secret from AWS Secrets Manager', async () => {
    send.mockResolvedValueOnce({ SecretString: JSON.stringify(SECRET_JSON) })

    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(SECRET_ARN),
    })

    expect(options.auth.signingKey).toBe(SECRET_JSON.private_key)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].input).toStrictEqual({
      SecretId: SECRET_ARN,
    })
  })

  it('throws when the Secrets Manager secret has no SecretString', async () => {
    send.mockResolvedValueOnce({ SecretBinary: new Uint8Array() })

    await expect(
      resolveFromEnvOptions({
        primary: 'rPrimary',
        env: envWith(SECRET_ARN),
      }),
    ).rejects.toThrow(SimpleXRPLError)
  })

  it('throws when the secret is not valid JSON', async () => {
    send.mockResolvedValueOnce({ SecretString: 'not json' })

    await expect(
      resolveFromEnvOptions({
        primary: 'rPrimary',
        env: envWith(SECRET_ARN),
      }),
    ).rejects.toThrow(SimpleXRPLError)
  })

  it('throws when the secret is missing private_key', async () => {
    send.mockResolvedValueOnce({
      SecretString: JSON.stringify({ user_alias: 'custody-author-1' }),
    })

    await expect(
      resolveFromEnvOptions({
        primary: 'rPrimary',
        env: envWith(SECRET_ARN),
      }),
    ).rejects.toThrow(SimpleXRPLError)
  })

  it('throws when the secret is missing user_alias', async () => {
    send.mockResolvedValueOnce({
      SecretString: JSON.stringify({ private_key: SIGNING_KEY_PEM }),
    })

    await expect(
      resolveFromEnvOptions({
        primary: 'rPrimary',
        env: envWith(SECRET_ARN),
      }),
    ).rejects.toThrow(SimpleXRPLError)
  })
})
