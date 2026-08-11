import { readFileSync } from 'node:fs'

import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'

import type { FeeIntent } from '../../domain/index.js'
import { CustodyAuthError, SimpleXRPLError } from '../../errors.js'
import type { components } from '../../generated/custody.js'

import {
  CustodyAuthService,
  IntentSigner,
  KeypairService,
} from './auth/index.js'
import { CustodyHttpClient } from './transport/custody-http-client.js'
import { FetchHttpPort } from './transport/fetch-http-port.js'
import { HttpCustodyAuthPort } from './transport/http-custody-auth-port.js'
import type { CustodyHttpPort } from './transport/http-port.js'

const DEFAULT_TIMEOUT_MS = 60_000

/** Auth construction options (TDD §3.3). */
export interface RippleCustodyAuthOptions {
  /** Intent-author private key: PEM contents, or a path to a `.pem` file. */
  readonly signingKey: string
  /** Matching public key, base64 SPKI DER. Derived from `signingKey` if omitted. */
  readonly publicKey?: string
  /** The Custody token endpoint URL. */
  readonly tokenUrl: string
  /** The OIDC client id to authenticate as. Defaults to `'customer_api'`. */
  readonly clientId?: string
}

/** Construction options for {@link RippleCustody.create}. */
export interface RippleCustodyOptions {
  /** The Custody gateway base URL. */
  readonly gatewayUrl: string
  /** Intent-author credentials and token endpoint. */
  readonly auth: RippleCustodyAuthOptions
  /** The Custody domain this custodian operates in. */
  readonly domainId: string
  /** The primary account's r-address; validated against the discovered set. */
  readonly primary: string
  /**
   * Enable the raw-signing fallback for transactors and fields this backend has
   * no native operation for.
   *
   * **Security note.** On the raw path the custodian signs an opaque payload
   * rather than a structured operation, so its transaction-level controls —
   * transfer policies, allow-lists, and approval rules keyed to operation
   * semantics — cannot inspect what is being signed. Ripple Custody types that
   * payload `Unsafe` for exactly this reason. xrpl.js protocol validation still
   * runs on every path, so malformed transactions are still rejected; what is
   * lost is the custodian's ability to reason about the transaction's intent.
   *
   * Leave this off unless a specific transactor requires it, and prefer routing
   * those operations through a signer that models them natively.
   *
   * @defaultValue `false`
   */
  readonly allowRawSigning?: boolean
  /** House fee intent, falls back to `Priority: Low`. */
  readonly defaultFee?: FeeIntent
  /** Pre-flight every write through Custody's dry-run. Defaults to `false`. */
  readonly defaultDryRun?: boolean
  /** How long `submitAndWait` polls before throwing `IntentPendingError`. */
  readonly defaultTimeoutMs?: number
  /** Injectable transport; defaults to `FetchHttpPort`. */
  readonly http?: CustodyHttpPort
}

/** Construction options for {@link RippleCustody.fromEnv}. */
export interface RippleCustodyFromEnvOptions {
  /** The primary account's r-address; validated against the discovered set. */
  readonly primary: string
  /**
   * Enable the raw-signing fallback for transactors and fields this backend has
   * no native operation for.
   *
   * **Security note.** On the raw path the custodian signs an opaque payload
   * rather than a structured operation, so its transaction-level controls —
   * transfer policies, allow-lists, and approval rules keyed to operation
   * semantics — cannot inspect what is being signed. Ripple Custody types that
   * payload `Unsafe` for exactly this reason. xrpl.js protocol validation still
   * runs on every path, so malformed transactions are still rejected; what is
   * lost is the custodian's ability to reason about the transaction's intent.
   *
   * Leave this off unless a specific transactor requires it, and prefer routing
   * those operations through a signer that models them natively.
   *
   * @defaultValue `false`
   */
  readonly allowRawSigning?: boolean
  /** House fee intent, falls back to `Priority: Low`. */
  readonly defaultFee?: FeeIntent
  /** Pre-flight every write through Custody's dry-run. Defaults to `false`. */
  readonly defaultDryRun?: boolean
  /** How long `submitAndWait` polls before throwing `IntentPendingError`. */
  readonly defaultTimeoutMs?: number
  /** Environment source to scan. Defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>
  /** Injectable transport; defaults to `FetchHttpPort`. */
  readonly http?: CustodyHttpPort
}

/** Fully assembled construction state, ready to hand to `new RippleCustody(...)`. */
export interface RippleCustodyState {
  readonly client: CustodyHttpClient
  readonly domainId: string
  readonly authorUserId: string
  readonly intentSigner: IntentSigner
  /** See the security note on {@link RippleCustodyOptions.allowRawSigning}. */
  readonly allowRawSigning: boolean
  readonly defaultFee: FeeIntent | undefined
  readonly defaultDryRun: boolean
  readonly defaultTimeoutMs: number
  readonly primaryAddress: string
}

/** A PEM private key starts with this marker; anything else is a file path. */
const PEM_MARKER = '-----BEGIN'

/** An AWS Secrets Manager secret ARN starts with this marker. */
const SECRETS_MANAGER_ARN_PREFIX = 'arn:aws:secretsmanager:'

/**
 * The Custody signing-key secret's shape in AWS Secrets Manager, per the
 * convention used elsewhere in Ripple (e.g. cbdc-wallet, ledger-object-service):
 * a JSON object, not a raw PEM string. `user_alias` identifies which Custody
 * user this keypair belongs to; it isn't consumed here since the adapter
 * resolves its author identity from `/v1/me` instead, but is validated as
 * present so a mismatched/incomplete secret fails fast.
 */
interface CustodySigningKeySecret {
  readonly public_key?: string
  readonly private_key?: string
  readonly user_alias?: string
}

/** A resolved signing key, with an optional public key from the same source. */
interface ResolvedSigningKey {
  readonly privateKeyPem: string
  readonly publicKey?: string
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
    public_key:
      'public_key' in parsed && typeof parsed.public_key === 'string'
        ? parsed.public_key
        : undefined,
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
 * Fetch and parse the Custody signing-key secret from AWS Secrets Manager.
 * Follows the same client/credential pattern used elsewhere in Ripple (e.g.
 * `ledger-object-service`'s `amm-caspian-fetcher` lambda): no explicit
 * credentials passed to the client — it relies on the default AWS SDK
 * credential provider chain (env vars, shared profile, or the runtime's role).
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

  return { privateKeyPem: secret.private_key, publicKey: secret.public_key }
}

/**
 * Resolve `RIPPLE_CUSTODY_AUTH_SIGNING_KEY`: literal PEM contents, a path to a
 * `.pem` file, or an AWS Secrets Manager secret ARN (TDD §3.3).
 *
 * @param value - The env var's raw value.
 * @returns The resolved private/public key pair.
 */
async function resolveSigningKey(value: string): Promise<ResolvedSigningKey> {
  if (value.startsWith(SECRETS_MANAGER_ARN_PREFIX)) {
    return fetchSigningKeySecret(value)
  }
  if (value.startsWith(PEM_MARKER)) {
    return { privateKeyPem: value }
  }
  // eslint-disable-next-line n/no-sync -- One-time startup config read, not on any request path.
  return { privateKeyPem: readFileSync(value, 'utf8') }
}

/**
 * Read a required environment variable.
 *
 * @param env - The environment source.
 * @param key - The variable name.
 * @returns The variable's value.
 * @throws {@link SimpleXRPLError} if the variable is missing or empty.
 */
function requireEnv(
  env: Readonly<Record<string, string | undefined>>,
  key: string,
): string {
  const value = env[key]
  if (value === undefined || value === '') {
    throw new SimpleXRPLError(
      `RippleCustody.fromEnv requires the ${key} environment variable`,
    )
  }
  return value
}

/**
 * Authenticate with Custody and resolve the intent-author's identity for a
 * new RippleCustody (TDD §3.3). Account discovery and primary validation
 * happen after this, in {@link RippleCustody.create} — they need a
 * constructed instance to back-reference.
 *
 * @param options - Gateway/auth/domain config, the primary account, and
 * optional raw-signing/fee/dry-run/timeout defaults.
 * @returns The assembled construction state.
 * @throws {@link CustodyAuthError} if the authenticated user has no access
 * to `options.domainId`.
 */
export async function buildRippleCustodyState(
  options: RippleCustodyOptions,
): Promise<RippleCustodyState> {
  const http = options.http ?? new FetchHttpPort()
  const keypair = KeypairService.fromPrivateKey(options.auth.signingKey)
  const authService = new CustodyAuthService({
    authPort: new HttpCustodyAuthPort({
      tokenUrl: options.auth.tokenUrl,
      http,
      clientId: options.auth.clientId,
    }),
    privateKey: options.auth.signingKey,
    publicKey: options.auth.publicKey,
  })
  const client = new CustodyHttpClient({
    gatewayUrl: options.gatewayUrl,
    http,
    auth: authService,
  })
  const intentSigner = new IntentSigner(keypair, options.auth.signingKey)

  const me =
    await client.get<components['schemas']['Core_MeReference']>('/v1/me')
  const domain = me.domains.find((entry) => entry.id === options.domainId)
  if (domain === undefined) {
    throw new CustodyAuthError(
      `The authenticated Custody user has no access to domain '${options.domainId}'`,
    )
  }

  return {
    client,
    domainId: options.domainId,
    authorUserId: domain.userReference.id,
    intentSigner,
    allowRawSigning: options.allowRawSigning ?? false,
    defaultFee: options.defaultFee,
    defaultDryRun: options.defaultDryRun ?? false,
    defaultTimeoutMs: options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    primaryAddress: options.primary,
  }
}

/**
 * Resolve `RIPPLE_CUSTODY_*` environment variables into full
 * {@link RippleCustodyOptions} (TDD §3.3's env var table).
 *
 * @param options - The primary account, optional overrides, and environment source.
 * @returns The resolved create() options.
 * @throws {@link SimpleXRPLError} if a required environment variable is missing.
 */
export async function resolveFromEnvOptions(
  options: RippleCustodyFromEnvOptions,
): Promise<RippleCustodyOptions> {
  // eslint-disable-next-line n/no-process-env -- fromEnv reads config from the environment by design.
  const env = options.env ?? process.env
  const signingKey = await resolveSigningKey(
    requireEnv(env, 'RIPPLE_CUSTODY_AUTH_SIGNING_KEY'),
  )
  return {
    gatewayUrl: requireEnv(env, 'RIPPLE_CUSTODY_GATEWAY_URL'),
    auth: {
      signingKey: signingKey.privateKeyPem,
      publicKey: env.RIPPLE_CUSTODY_AUTH_PUBLIC_KEY ?? signingKey.publicKey,
      tokenUrl: requireEnv(env, 'RIPPLE_CUSTODY_AUTH_TOKEN_URL'),
      clientId: env.RIPPLE_CUSTODY_AUTH_CLIENT_ID,
    },
    domainId: requireEnv(env, 'RIPPLE_CUSTODY_DOMAIN_ID'),
    primary: options.primary,
    allowRawSigning: options.allowRawSigning,
    defaultFee: options.defaultFee,
    defaultDryRun: options.defaultDryRun,
    defaultTimeoutMs: options.defaultTimeoutMs,
    http: options.http,
  }
}
