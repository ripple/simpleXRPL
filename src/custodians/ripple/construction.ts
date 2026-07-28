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
  /** Enable the raw-signing fallback (TDD §12.1). Defaults to `false`. */
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
  /** Enable the raw-signing fallback (TDD §12.1). Defaults to `false`. */
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
 * Fetch a signing key PEM from AWS Secrets Manager.
 *
 * @param secretId - The secret's ARN.
 * @returns The secret's PEM contents.
 * @throws {@link SimpleXRPLError} if the secret has no string value.
 */
async function fetchSigningKeyFromSecretsManager(
  secretId: string,
): Promise<string> {
  const client = new SecretsManagerClient({})
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  )
  if (response.SecretString === undefined) {
    throw new SimpleXRPLError(
      `Secrets Manager secret '${secretId}' has no SecretString value`,
    )
  }
  return response.SecretString
}

/**
 * Resolve `RIPPLE_CUSTODY_AUTH_SIGNING_KEY`: literal PEM contents, a path to a
 * `.pem` file, or an AWS Secrets Manager secret ARN (TDD §3.3).
 *
 * @param value - The env var's raw value.
 * @returns The PEM contents.
 */
async function resolveSigningKeyPem(value: string): Promise<string> {
  if (value.startsWith(SECRETS_MANAGER_ARN_PREFIX)) {
    return fetchSigningKeyFromSecretsManager(value)
  }
  if (value.startsWith(PEM_MARKER)) {
    return value
  }
  // eslint-disable-next-line n/no-sync -- One-time startup config read, not on any request path.
  return readFileSync(value, 'utf8')
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
  const signingKeyPem = options.auth.signingKey
  const keypair = KeypairService.fromPrivateKey(signingKeyPem)
  const authService = new CustodyAuthService({
    authPort: new HttpCustodyAuthPort({
      tokenUrl: options.auth.tokenUrl,
      http,
    }),
    privateKey: signingKeyPem,
    publicKey: options.auth.publicKey,
  })
  const client = new CustodyHttpClient({
    gatewayUrl: options.gatewayUrl,
    http,
    auth: authService,
  })
  const intentSigner = new IntentSigner(keypair, signingKeyPem)

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
  return {
    gatewayUrl: requireEnv(env, 'RIPPLE_CUSTODY_GATEWAY_URL'),
    auth: {
      signingKey: await resolveSigningKeyPem(
        requireEnv(env, 'RIPPLE_CUSTODY_AUTH_SIGNING_KEY'),
      ),
      publicKey: env.RIPPLE_CUSTODY_AUTH_PUBLIC_KEY,
      tokenUrl: requireEnv(env, 'RIPPLE_CUSTODY_AUTH_TOKEN_URL'),
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
