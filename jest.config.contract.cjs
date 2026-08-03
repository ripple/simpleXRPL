// Contract tier (live custodian sandbox). Exercises the RippleCustody adapter
// against a real Custody sandbox to catch wire-shape drift the compile-time
// generated types can't (§13.1). Requires RIPPLE_CUSTODY_* credentials; the
// suite skips itself when they are absent, so it is safe to run anywhere.
// Runs serially with --runInBand to avoid intent/sequence conflicts.
const base = require('./jest.config.base.cjs')

module.exports = {
  ...base,
  displayName: 'contract',
  roots: ['<rootDir>/test/contract'],
  testMatch: ['<rootDir>/test/contract/**/*.test.ts'],
  testTimeout: 120000,
  collectCoverage: false,
}
