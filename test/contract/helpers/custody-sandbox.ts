/**
 * The environment variables a Custody sandbox contract run needs. The first
 * four are the same knobs `RippleCustody.fromEnv` reads (TDD §3.3);
 * `RIPPLE_CUSTODY_PRIMARY_ADDRESS` is the contract harness's own — the primary
 * account's r-address, which `fromEnv` takes as an argument rather than from
 * the environment.
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
export const hasSandboxCredentials: boolean = REQUIRED_ENV.every((key) => {
  const value = process.env[key]
  return value !== undefined && value !== ''
})

/** The primary account r-address for the sandbox run (empty when unconfigured). */
export const SANDBOX_PRIMARY: string =
  process.env.RIPPLE_CUSTODY_PRIMARY_ADDRESS ?? ''

/* eslint-enable n/no-process-env */

/**
 * `describe` when the sandbox is configured, `describe.skip` otherwise — so the
 * contract suite runs only where it can actually reach a sandbox.
 */
export const describeContract = hasSandboxCredentials ? describe : describe.skip
