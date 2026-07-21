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
 * are never written to logs.
 *
 * @internal
 */
export const REDACTED_FIELDS: readonly string[] = [
  'signingKey',
  'apiKey',
  'seed',
  'mnemonic',
  'access_token',
  'refresh_token',
]
