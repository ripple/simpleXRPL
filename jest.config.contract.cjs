// Contract tier (live custodian sandbox). Exercises each custodian adapter
// against a real backend sandbox to catch wire-shape drift the compile-time
// generated types can't: Ripple Custody, Palisade, and AWS KMS. Every suite is
// gated on its own credentials and skips itself when they are absent, so the
// tier is safe to run anywhere.
//
// Some of these suites also round-trip through the live testnet (funding via
// the faucet, submitting the signed blob), so they share `test/helpers/testnet`
// with the integration tier — hence `roots` covers both directories.
//
// Runs serially with --runInBand to avoid intent/sequence conflicts.
const base = require('./jest.config.base.cjs')

module.exports = {
  ...base,
  displayName: 'contract',
  // Fills credentials from `.env` locally; a no-op in CI, where the job's
  // secrets are already in the environment and take precedence.
  setupFiles: ['<rootDir>/test/setup-env.cjs'],
  roots: ['<rootDir>/test/contract', '<rootDir>/test/helpers'],
  testMatch: ['<rootDir>/test/contract/**/*.test.ts'],
  testTimeout: 120000,
  collectCoverage: false,
}
