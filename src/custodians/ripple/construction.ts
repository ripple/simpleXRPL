import type { FeeIntent } from '../../domain/index.js'
import { SimpleXRPLError } from '../../errors.js'
import type { components } from '../../generated/custody.js'
import { withHttpLogging } from '../http-logging.js'
import type { HttpDebugOption } from '../http-logging.js'

import {
  CustodyAuthService,
  IntentSigner,
  resolveKeySigner,
} from './auth/index.js'
import type { CustodySignerPort } from './auth/index.js'
import { resolveSigningKey } from './auth/signing-key.js'
import { resolveDomain } from './discovery/domain-resolution.js'
import { CustodyHttpClient } from './transport/custody-http-client.js'
import { FetchHttpPort } from './transport/fetch-http-port.js'
import { HttpCustodyAuthPort } from './transport/http-custody-auth-port.js'
import type { CustodyHttpPort } from './transport/http-port.js'
import { resolveVersionGuard } from './versioning/detect.js'
import type { CustodyVersionOptions } from './versioning/detect.js'
import type { VersionGuard } from './versioning/version-guard.js'

const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Auth construction options. The Custody API user's key — which signs the
 * login challenge and every intent — is given exactly one way: `signingKey`
 * (a PEM held in process) or `signer` (an HSM or KMS, so the private key never
 * enters the process).
 */
export type RippleCustodyAuthOptions = {
  /** The Custody token endpoint URL. */
  readonly tokenUrl: string
  /** The OIDC client id to authenticate as. Defaults to `'customer_api'`. */
  readonly clientId?: string
} & (
  | {
      /** The API user's private key, as PEM contents. */
      readonly signingKey: string
      readonly signer?: never
    }
  | {
      /**
       * The API user's key in an HSM or KMS. See {@link CustodySignerPort};
       * `simplexrpl/aws-kms` ships an AWS KMS implementation.
       */
      readonly signer: CustodySignerPort
      readonly signingKey?: never
    }
)

/** Construction options for {@link RippleCustody.create}. */
export interface RippleCustodyOptions extends CustodyVersionOptions {
  /** The Custody gateway base URL. */
  readonly gatewayUrl: string
  /** Intent-author credentials and token endpoint. */
  readonly auth: RippleCustodyAuthOptions
  /**
   * The Custody domain this custodian operates in. Omitted, it is the domain
   * that holds the `primary` address, looked up at creation.
   */
  readonly domainId?: string
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
   * payload `Unsafe` for exactly this reason. xrpl protocol validation still
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
  /**
   * Log every Custody HTTP request — method, URL, status, duration, and the
   * bodies with credentials masked: `true` to `console.debug`, or to a logger
   * with a `debug(message, fields)` method.
   */
  readonly debug?: HttpDebugOption
  /**
   * Abort each Custody API or token request after this many milliseconds, so a
   * hung connection surfaces as an error instead of stalling the caller.
   *
   * @defaultValue 30 000
   */
  readonly requestTimeoutMs?: number
}

/** Construction options for {@link RippleCustody.fromEnv}. */
export interface RippleCustodyFromEnvOptions extends CustodyVersionOptions {
  /** The primary account's r-address; validated against the discovered set. */
  readonly primary: string
  /**
   * The API user's key in an HSM or KMS, instead of
   * `RIPPLE_CUSTODY_AUTH_SIGNING_KEY` (which is then not read).
   */
  readonly signer?: CustodySignerPort
  /**
   * Enable the raw-signing fallback for transactors and fields this backend has
   * no native operation for.
   *
   * **Security note.** On the raw path the custodian signs an opaque payload
   * rather than a structured operation, so its transaction-level controls —
   * transfer policies, allow-lists, and approval rules keyed to operation
   * semantics — cannot inspect what is being signed. Ripple Custody types that
   * payload `Unsafe` for exactly this reason. xrpl protocol validation still
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
  /**
   * Log every Custody HTTP request — method, URL, status, duration, and the
   * bodies with credentials masked: `true` to `console.debug`, or to a logger
   * with a `debug(message, fields)` method.
   */
  readonly debug?: HttpDebugOption
  /**
   * Abort each Custody API or token request after this many milliseconds, so a
   * hung connection surfaces as an error instead of stalling the caller.
   *
   * @defaultValue 30 000
   */
  readonly requestTimeoutMs?: number
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
  /** Blocks calls the instance's Custody version can't serve. */
  readonly versionGuard: VersionGuard
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
 * Assemble the authenticated HTTP client and the intent signer, both backed by
 * the API user's key.
 *
 * @param options - Gateway and auth config.
 * @param http - The transport.
 * @returns The client and intent signer.
 */
async function createClientAndSigner(
  options: RippleCustodyOptions,
  http: CustodyHttpPort,
): Promise<{ client: CustodyHttpClient; intentSigner: IntentSigner }> {
  const keySigner = await resolveKeySigner(options.auth)
  const authService = new CustodyAuthService({
    authPort: new HttpCustodyAuthPort({
      tokenUrl: options.auth.tokenUrl,
      http,
      clientId: options.auth.clientId,
      timeoutMs: options.requestTimeoutMs,
    }),
    keySigner,
  })
  return {
    client: new CustodyHttpClient({
      gatewayUrl: options.gatewayUrl,
      http,
      auth: authService,
      timeoutMs: options.requestTimeoutMs,
    }),
    intentSigner: new IntentSigner(keySigner),
  }
}

/**
 * Authenticate with Custody and resolve the intent-author's identity for a
 * new RippleCustody. Account discovery and primary validation
 * happen after this, in {@link RippleCustody.create} — they need a
 * constructed instance to back-reference.
 *
 * @param options - Gateway/auth/domain config, the primary account, and
 * optional raw-signing/fee/dry-run/timeout/version defaults.
 * @returns The assembled construction state.
 * @throws {@link CustodyAuthError} if the authenticated user has no access
 * to `options.domainId`.
 * @throws {@link SimpleXRPLError} for an unknown `apiVersion`, or when no
 * `domainId` is set and the primary address isn't in exactly one domain.
 */
export async function buildRippleCustodyState(
  options: RippleCustodyOptions,
): Promise<RippleCustodyState> {
  const http = withHttpLogging(
    options.http ?? new FetchHttpPort(),
    options.debug,
    { custodian: 'ripple-custody', label: 'Ripple Custody' },
  )
  const { client, intentSigner } = await createClientAndSigner(options, http)

  // Version detection reads the instance's own OpenAPI document; run it
  // alongside the identity lookup so it adds no latency to create().
  const [me, versionGuard] = await Promise.all([
    client.get<components['schemas']['Core_MeReference']>('/v1/me'),
    resolveVersionGuard(options, http, options.gatewayUrl),
  ])
  const { domainId, authorUserId } = await resolveDomain(client, me, options)

  return {
    client,
    domainId,
    authorUserId,
    intentSigner,
    allowRawSigning: options.allowRawSigning ?? false,
    defaultFee: options.defaultFee,
    defaultDryRun: options.defaultDryRun ?? false,
    defaultTimeoutMs: options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    primaryAddress: options.primary,
    versionGuard,
  }
}

/**
 * Resolve `RIPPLE_CUSTODY_*` environment variables into full
 * {@link RippleCustodyOptions} (env var table).
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
  const tokenUrl = requireEnv(env, 'RIPPLE_CUSTODY_AUTH_TOKEN_URL')
  const clientId = env.RIPPLE_CUSTODY_AUTH_CLIENT_ID
  // With a signer the key lives in an HSM/KMS, so the key variable isn't read.
  const auth: RippleCustodyAuthOptions =
    options.signer === undefined
      ? {
          signingKey: (
            await resolveSigningKey(
              requireEnv(env, 'RIPPLE_CUSTODY_AUTH_SIGNING_KEY'),
            )
          ).privateKeyPem,
          tokenUrl,
          clientId,
        }
      : { signer: options.signer, tokenUrl, clientId }
  return {
    gatewayUrl: requireEnv(env, 'RIPPLE_CUSTODY_GATEWAY_URL'),
    auth,
    // Unset or empty: the domain is found from the primary address.
    domainId:
      env.RIPPLE_CUSTODY_DOMAIN_ID === ''
        ? undefined
        : env.RIPPLE_CUSTODY_DOMAIN_ID,
    primary: options.primary,
    allowRawSigning: options.allowRawSigning,
    defaultFee: options.defaultFee,
    defaultDryRun: options.defaultDryRun,
    defaultTimeoutMs: options.defaultTimeoutMs,
    http: options.http,
    debug: options.debug,
    requestTimeoutMs: options.requestTimeoutMs,
    apiVersion: options.apiVersion,
    autoDetectVersion: options.autoDetectVersion,
    openApiUrl: options.openApiUrl,
  }
}
