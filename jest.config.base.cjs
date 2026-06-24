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
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageReporters: [['text', { skipFull: true }], 'text-summary'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/generated/**'],
  testEnvironmentOptions: {},
}
