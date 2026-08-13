/* eslint-disable n/no-process-env -- the contract tier reads backend credentials from the environment by design */

/**
 * Credential gating shared by every contract suite.
 *
 * Each suite needs its own backend's credentials, so it self-skips when they're
 * absent — that is what keeps `npm run test:contract` safe to run on a laptop
 * with no sandbox configured.
 *
 * The problem is what that means in CI. A skipped suite exits 0, so the
 * `contract-tests` job reports success while a whole custodian goes unexercised
 * — which is exactly how the Ripple Custody suite sat un-run for months behind a
 * mistyped secret name. Green meant "nothing ran", and nothing said so.
 *
 * {@link REQUIRE_ALL_ENV} closes that: set it wherever every backend is expected
 * to be configured, and a missing credential becomes a failing test naming the
 * exact variables rather than a silent skip. Local runs stay permissive.
 */

/** Set this to make absent credentials fail the suite instead of skipping it. */
export const REQUIRE_ALL_ENV = 'CONTRACT_REQUIRE_ALL'

/** Whether skips are currently forbidden. */
const requireAll = (process.env[REQUIRE_ALL_ENV] ?? '') !== ''

/**
 * Which of `required` are missing. Treats blank as absent: an unset GitHub
 * Actions secret expands to an empty string rather than `undefined`, so an
 * `=== undefined` check alone would let a suite run with empty credentials and
 * fail deep inside the backend instead of reporting the real cause.
 *
 * @param required - The environment variables the suite needs.
 * @returns The missing variable names, in the given order.
 */
export function missingEnv(required: readonly string[]): string[] {
  return required.filter((key) => {
    const value = process.env[key]
    return value === undefined || value === ''
  })
}

/**
 * The `describe` a contract suite should register itself with.
 *
 * - all credentials present → the suite runs
 * - some absent, `CONTRACT_REQUIRE_ALL` unset → the suite skips (laptop-safe)
 * - some absent, `CONTRACT_REQUIRE_ALL` set → a failing placeholder suite that
 *   names the missing variables, so CI cannot go green on an un-run backend
 *
 * @param backend - The backend name, for the failure message.
 * @param required - The environment variables the suite needs.
 * @returns A `describe`-compatible function to declare the suite with.
 */
export function contractSuite(
  backend: string,
  required: readonly string[],
): jest.Describe {
  const missing = missingEnv(required)
  if (missing.length === 0) {
    return describe
  }
  if (!requireAll) {
    return describe.skip
  }
  // Register a suite that fails rather than one that silently does nothing.
  const failing = (title: string): void => {
    describe(title, () => {
      it(`has the credentials it needs`, () => {
        throw new Error(
          `${backend} contract suite cannot run: missing ${missing.join(', ')}. ` +
            `Set them, or unset ${REQUIRE_ALL_ENV} to allow this suite to skip.`,
        )
      })
    })
  }
  return failing as unknown as jest.Describe
}
