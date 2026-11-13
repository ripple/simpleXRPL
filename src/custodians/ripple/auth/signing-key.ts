import { readFileSync } from 'node:fs'

import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'

import { SimpleXRPLError } from '../../../errors.js'

/*
 * Resolving the Custody API user's signing key from wherever it is configured:
 * literal PEM contents, a path to a `.pem` file, or an AWS Secrets Manager
 * secret ARN — with the newline/quoting hazards of each normalized away.
 */

/** A PEM private key starts with this marker; anything else is a file path. */
const PEM_MARKER = '-----BEGIN'

/** An AWS Secrets Manager secret ARN starts with this marker. */
const SECRETS_MANAGER_ARN_PREFIX = 'arn:aws:secretsmanager:'

/**
 * The Custody signing-key secret's shape in AWS Secrets Manager: a JSON object,
 * not a raw PEM string. `user_alias` identifies which Custody user this keypair
 * belongs to; it isn't consumed here since the adapter resolves its author
 * identity from `/v1/me` instead, but is validated as present so a
 * mismatched/incomplete secret fails fast.
 */
interface CustodySigningKeySecret {
  readonly private_key?: string
  readonly user_alias?: string
}

/** A resolved signing key. The public key is derived from it, never carried. */
interface ResolvedSigningKey {
  readonly privateKeyPem: string
}

/**
 * Parse a Custody signing-key secret's JSON body.
 *
 * @param body - The secret's raw JSON string.
 * @returns The parsed fields, or `undefined` if not a JSON object.
 */
function parseSigningKeySecret(
  body: string,
): CustodySigningKeySecret | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined
  }
  return {
    private_key:
      'private_key' in parsed && typeof parsed.private_key === 'string'
        ? parsed.private_key
        : undefined,
    user_alias:
      'user_alias' in parsed && typeof parsed.user_alias === 'string'
        ? parsed.user_alias
        : undefined,
  }
}

/**
 * Fetch and parse the Custody signing-key secret from AWS Secrets Manager. No
 * explicit credentials are passed to the client — it relies on the default AWS
 * SDK credential provider chain (env vars, shared profile, or the runtime's
 * role).
 *
 * @param secretId - The secret's ARN.
 * @returns The parsed private/public key pair.
 * @throws {@link SimpleXRPLError} if the secret string is empty, isn't valid
 * JSON, or is missing `private_key` or `user_alias`.
 */
async function fetchSigningKeySecret(
  secretId: string,
): Promise<ResolvedSigningKey> {
  const client = new SecretsManagerClient({})
  const secretResponse = await client.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  )
  if (!secretResponse.SecretString) {
    throw new SimpleXRPLError('Secret string is empty')
  }

  const secret = parseSigningKeySecret(secretResponse.SecretString)
  if (secret === undefined) {
    throw new SimpleXRPLError(
      `Secrets Manager secret '${secretId}' is not valid JSON`,
    )
  }
  if (!secret.private_key || !secret.user_alias) {
    throw new SimpleXRPLError('private_key or user_alias not found in secret')
  }

  // Same escaped-newline hazard as the env var: a PEM stored in a JSON secret
  // field commonly arrives with its line breaks escaped.
  return {
    privateKeyPem: normalizePem(secret.private_key),
  }
}

/**
 * Strip one layer of wrapping single or double quotes.
 *
 * Secret stores and `.env` parsers routinely hand back a quoted value. A quoted
 * PEM matches none of the prefixes {@link resolveSigningKey} tests, so it would
 * otherwise fall through to being treated as a file path.
 *
 * @param value - The raw value.
 * @returns `value` without a matched pair of surrounding quotes.
 */
function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  return quoted && trimmed.length >= 2 ? trimmed.slice(1, -1) : trimmed
}

/**
 * Restore real newlines in a PEM whose line breaks were escaped in transit.
 *
 * A PEM is inherently multi-line, but the places it travels through — GitHub
 * Actions secrets, `.env` files, JSON string fields, shell exports — frequently
 * turn each newline into a literal backslash-n. `createPrivateKey` then rejects
 * the value outright, and because the algorithm can no longer be detected the
 * failure surfaced as "unsupported private key algorithm", which points at the
 * key's curve rather than at its formatting. This is the single most common way
 * a valid Custody signing key fails to load, so normalize it rather than making
 * every operator rediscover it.
 *
 * @param pem - PEM contents, possibly carrying escaped newlines.
 * @returns The PEM with `\n` / `\r\n` escape sequences replaced by real
 *   newlines, and a trailing newline ensured.
 */
function normalizePem(pem: string): string {
  const withNewlines = pem.replace(/(?:\\r)?\\n/gu, '\n').trim()
  return `${withNewlines}\n`
}

/**
 * Resolve `RIPPLE_CUSTODY_AUTH_SIGNING_KEY`: literal PEM contents, a path to a
 * `.pem` file, or an AWS Secrets Manager secret ARN.
 *
 * @param value - The env var's raw value.
 * @returns The resolved private/public key pair.
 */
export async function resolveSigningKey(
  value: string,
): Promise<ResolvedSigningKey> {
  const unquoted = stripWrappingQuotes(value)
  if (unquoted.startsWith(SECRETS_MANAGER_ARN_PREFIX)) {
    return fetchSigningKeySecret(unquoted)
  }
  if (unquoted.startsWith(PEM_MARKER)) {
    return { privateKeyPem: normalizePem(unquoted) }
  }
  // eslint-disable-next-line n/no-sync -- One-time startup config read, not on any request path.
  return { privateKeyPem: readFileSync(value, 'utf8') }
}
