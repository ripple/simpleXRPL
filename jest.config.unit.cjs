// Unit tier (offline, no network) — pure Build/Validate functions, dispatch
// orchestration with the network stubbed via in-memory ports.
const base = require('./jest.config.base.cjs')

module.exports = {
  ...base,
  displayName: 'unit',
  roots: ['<rootDir>/src', '<rootDir>/test/unit'],
  testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
  // TODO: raise to 85% line coverage once the Build/Validate layers land.
  coverageThreshold: {
    global: {
      lines: 0,
      statements: 0,
      branches: 0,
      functions: 0,
    },
  },
}
