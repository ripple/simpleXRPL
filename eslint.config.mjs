import xrplfBase from '@xrplf/eslint-config/base'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      'docs/',
      // Doc samples: type-checked via tsconfig.examples.json, not linted with
      // the strict src rules (they use console + placeholder literals).
      'examples/',
      // Generated from vendored OpenAPI specs — never hand-edited or linted.
      'src/generated/',
      // Tooling configs are CommonJS / plain JS, not part of the typed project.
      '**/*.cjs',
      '**/*.mjs',
      '**/*.js',
    ],
  },
  ...xrplfBase,
  {
    languageOptions: {
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.eslint.json'],
      },
    },
    rules: {
      // Known incompatibility between this rule and flat config (it needs an
      // .eslintrc to resolve ignores); disabled the same way xrpl.js does.
      'import/no-unused-modules': 'off',
      // XRPL and custodian REST APIs use snake_case field names, so interfaces
      // modeling them are allowed to be snake_case as well as PascalCase.
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'interface', format: ['PascalCase', 'snake_case'] },
      ],
      // We use named exports throughout, and NodeNext requires `.js` import
      // extensions — neither should be flagged.
      'import/prefer-default-export': 'off',
      'import/extensions': 'off',
      'import/no-named-as-default': 'off',
      'multiline-comment-style': 'off',
      // `r`/`s` (ECDSA signature scalars) and `x`/`y` (EC point coordinates)
      // are the standard one-letter names in elliptic-curve code.
      'id-length': ['error', { exceptions: ['_', 'r', 's', 'x', 'y'] }],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error'],
      'max-lines-per-function': [
        'warn',
        { max: 40, skipBlankLines: true, skipComments: true },
      ],
      'max-statements': ['warn', 25],
      'max-depth': ['warn', 3],
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-unpublished-import': 'off',
      // JSDoc prose is advisory here; type signatures are the spec.
      'jsdoc/check-examples': 'off',
      'jsdoc/check-tag-names': 'off',
      'jsdoc/require-hyphen-before-param-description': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      'tsdoc/syntax': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'max-nested-callbacks': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      // Tests legitimately generate keypairs synchronously in setup, pass
      // deliberately-wrong types to assert validation, and own their fixtures.
      'n/no-sync': 'off',
      '@typescript-eslint/parameter-properties': 'off',
      // Tests inspect and combine XRPL flag bitmasks.
      'no-bitwise': 'off',
    },
  },
]
