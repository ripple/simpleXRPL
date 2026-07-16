// Unit tier (offline, no network) — pure Build/Validate functions, dispatch
// orchestration with the network stubbed via in-memory ports.
const base = require('./jest.config.base.cjs')

module.exports = {
  ...base,
  displayName: 'unit',
  roots: ['<rootDir>/src', '<rootDir>/test/unit'],
  testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
  // Build/Validate/vertical layers have landed; enforce coverage with a small
  // buffer below current (~93% lines / ~90% branches) so a real regression
  // fails CI without tripping on minor fluctuation.
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
      branches: 85,
      functions: 88,
    },
  },
}
