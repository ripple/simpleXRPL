// Shared Jest configuration. Tests are transpiled by ts-jest to CommonJS,
// independent of the package's dual ESM+CJS build output.
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  // Source uses NodeNext `.js` extensions on relative imports; strip them so
  // ts-jest resolves the sibling `.ts` file.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node10',
          // ts-jest transpiles per-file; the project-wide unused checks run via `tsc`.
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
    // xrpl and ripple-* resolve to their TS source under Jest, pulling in
    // ESM-only crypto deps (@noble/@scure). Transpile those JS files to CommonJS.
    'node_modules/(@noble|@scure|@xrplf)/.+\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node10',
          allowJs: true,
          checkJs: false,
        },
      },
    ],
  },
  // node_modules are not transformed by default; un-ignore the ripple + crypto
  // chain (loaded as TS/ESM source) so their non-CommonJS files are transpiled.
  transformIgnorePatterns: [
    '/node_modules/(?!(@noble|@scure|@xrplf|xrpl|ripple-address-codec|ripple-binary-codec|ripple-keypairs)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageReporters: [['text', { skipFull: true }], 'text-summary'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/generated/**'],
  testEnvironmentOptions: {},
}
