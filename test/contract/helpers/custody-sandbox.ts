import { contractSuite, missingEnv } from './contract-gate.js'

/**
 * The environment variables a Custody sandbox contract run needs. The first
 * four are the same knobs `RippleCustody.fromEnv` reads;
 * `RIPPLE_CUSTODY_PRIMARY_ADDRESS` is the contract harness's own — the primary
 * account's r-address, which `fromEnv` takes as an argument rather than from
 * the environment.
 *
 * `RIPPLE_CUSTODY_AUTH_SIGNING_KEY` accepts any form `resolveFromEnvOptions`
 * supports: literal PEM contents, a `.pem` file path, or an AWS Secrets
 * Manager secret ARN (see `construction.ts`).
 */
const REQUIRED_ENV = [
  'RIPPLE_CUSTODY_GATEWAY_URL',
  'RIPPLE_CUSTODY_AUTH_SIGNING_KEY',
  'RIPPLE_CUSTODY_AUTH_TOKEN_URL',
  'RIPPLE_CUSTODY_DOMAIN_ID',
  'RIPPLE_CUSTODY_PRIMARY_ADDRESS',
] as const

/* eslint-disable n/no-process-env -- the contract tier reads sandbox credentials from the environment by design */

/**
 * Whether every credential the contract tier needs is present. When any is
 * missing the suite skips itself, so the tier is safe to run anywhere (CI
 * without secrets, a laptop without a sandbox) — it only executes where a
 * sandbox is actually configured.
 */
export const hasSandboxCredentials: boolean =
  missingEnv(REQUIRED_ENV).length === 0

/** The primary account r-address for the sandbox run (empty when unconfigured). */
export const SANDBOX_PRIMARY: string =
  process.env.RIPPLE_CUSTODY_PRIMARY_ADDRESS ?? ''

/* eslint-enable n/no-process-env */

/**
 * How the Ripple Custody suite declares itself: it runs when the sandbox is
 * configured, skips when it isn't, and fails loudly instead of skipping when
 * `CONTRACT_REQUIRE_ALL` is set (see {@link contractSuite}).
 */
export const describeContract = contractSuite('Ripple Custody', REQUIRED_ENV)
