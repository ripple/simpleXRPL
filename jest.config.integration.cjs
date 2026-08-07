// Live tier (real network, run serially with --runInBand to avoid
// sequence-number conflicts on shared accounts).
const base = require('./jest.config.base.cjs')

module.exports = {
  ...base,
  displayName: 'integration',
  // Fills credentials from `.env` locally; a no-op in CI, where the job's
  // secrets are already in the environment and take precedence.
  setupFiles: ['<rootDir>/test/setup-env.cjs'],
  roots: ['<rootDir>/test/integration', '<rootDir>/test/helpers'],
  testMatch: ['<rootDir>/test/integration/**/*.test.ts'],
  testTimeout: 120000,
  collectCoverage: false,
}
