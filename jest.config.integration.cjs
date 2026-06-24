// Live tier (real network, run serially with --runInBand to avoid
// sequence-number conflicts on shared accounts).
const base = require('./jest.config.base.cjs')

module.exports = {
  ...base,
  displayName: 'integration',
  roots: ['<rootDir>/test/integration'],
  testMatch: ['<rootDir>/test/integration/**/*.test.ts'],
  testTimeout: 60000,
  collectCoverage: false,
}
