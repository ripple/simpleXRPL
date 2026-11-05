/**
 * Log severity levels, mirroring a minimal pino/bunyan subset.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured logger interface used across the SDK. Implementations receive the
 * redaction list below so known-sensitive fields never reach log output.
 */
export interface Logger {
  /** Log at debug level. */
  readonly debug: (message: string, fields?: Record<string, unknown>) => void

  /** Log at info level. */
  readonly info: (message: string, fields?: Record<string, unknown>) => void

  /** Log at warn level. */
  readonly warn: (message: string, fields?: Record<string, unknown>) => void

  /** Log at error level. */
  readonly error: (message: string, fields?: Record<string, unknown>) => void
}

/**
 * Field names a logger implementation must redact, so credentials and tokens
 * are never written to logs. Covers the SDK's own credential-bearing fields
 * (across the custodian configs and transport layers) in both camelCase and
 * snake_case, since implementers may serialize objects from either surface.
 *
 * @internal
 */
export const REDACTED_FIELDS: readonly string[] = [
  // Signing material and seeds.
  'signingKey',
  'privateKey',
  'privateKeyPem',
  'private_key',
  'seed',
  'encryptedSeed',
  'mnemonic',
  // API credentials.
  'apiKey',
  'clientSecret',
  'client_secret',
  'secret',
  'password',
  'passphrase',
  // A signed login challenge: the SDK picks the challenge, so the pair is
  // exchangeable for a token. (Masks intent-envelope signatures too, which
  // are harmless either way.)
  'challenge',
  'signature',
  // Bearer tokens, and the header that carries them.
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
  'authorization',
]
