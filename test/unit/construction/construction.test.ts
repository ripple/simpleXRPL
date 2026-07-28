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
    expect(send).not.toHaveBeenCalled()
  })

  it('fetches the signing key from AWS Secrets Manager when given a secret ARN', async () => {
    send.mockResolvedValueOnce({ SecretString: SIGNING_KEY_PEM })

    const options = await resolveFromEnvOptions({
      primary: 'rPrimary',
      env: envWith(SECRET_ARN),
    })

    expect(options.auth.signingKey).toBe(SIGNING_KEY_PEM)
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
})
