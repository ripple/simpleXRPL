# CLAUDE.md — simpleXRPL conventions

Guidance for working in this repo: the mechanical conventions the scaffold
established.

## Project shape

- Single npm package (not a monorepo). Source in `src/`, tests in `test/`.
- Public entry point: `src/index.ts`. Everything callers use is re-exported here.
- **Node-targeted, not browser.** No browser bundle or browser tests; Node-only
  APIs (`node:crypto`, secret managers, HTTPS agents) may be imported freely.
  Browser users are directed to the `xrpl` package directly.

## Module system & imports

- Authored as **ESM** (`"type": "module"`), compiled with **NodeNext**.
- **Relative imports MUST carry the `.js` extension** (e.g.
  `import { VERSION } from './version.js'`), even though the source file is
  `.ts`. This is required for the emitted ESM build to resolve at runtime.
  - Jest strips the extension via a `moduleNameMapper` so ts-jest resolves the
    `.ts` source; the dual build relies on it for the ESM output.

## Dual ESM + CJS build

- `npm run build` runs two `tsc` passes: `tsconfig.esm.json` → `dist/esm`
  (NodeNext) and `tsconfig.cjs.json` → `dist/cjs` (CommonJS), then
  `scripts/fixup-dist.mjs` writes a `package.json` `type` marker into each
  output dir. `package.json` `exports` maps `import`/`require` accordingly.
- `tsconfig.json` is the shared base (and the typecheck target). Don't add
  `verbatimModuleSyntax` — it breaks the CommonJS pass.

## Generated custodian types

- Adapter wire types are **generated, never hand-authored**. `npm run typegen`
  runs `openapi-typescript` (+ prettier) over the pinned specs in `openapi/`
  into `src/generated/{custody,palisade}.ts`.
- These generated files **are committed** (not git-ignored): the repo stays
  self-contained, and an API change shows up as a diff in review. CI regenerates
  and fails if they're stale. ESLint skips them; Prettier formats them.
- The vendored specs are **read-only** — they come from the custodian servers.
  Never hand-edit a spec or a generated file.
- Reference generated types via the two top-level exports:
  ```ts
  import type { components, operations } from '../generated/custody.js'
  type Body =
    operations['<operationId>']['requestBody']['content']['application/json']
  type Schema = components['schemas']['<SchemaName>']
  ```
- The **only** hand-authored types are SDK-internal ones with no API counterpart
  (e.g. option bags, unions over generated types).
- Bumping a custodian API version = drop the new spec (plus any files it
  `$ref`s) in `openapi/`, update the `typegen:*` paths, run `npm run typegen`,
  commit, and resolve any resulting type errors. See
  [`openapi/README.md`](./openapi/README.md).

## Testing

Three tiers, one Jest config each (`jest.config.{unit,integration,contract}.cjs`,
sharing `jest.config.base.cjs`):

- **Unit** (`npm test`, `test/unit/`): offline, no network. Pure Build/Validate
  functions and dispatch orchestration with in-memory ports. Target ≥85% line
  coverage (threshold currently 0 until the Build/Validate layers land).
- **Integration** (`npm run test:integration`, `test/integration/`): live
  testnet, run with `--runInBand` to avoid sequence-number conflicts.
- **Contract** (`npm run test:contract`, `test/contract/`): one suite per
  custodian backend, run against that backend's live sandbox to catch wire-shape
  drift the generated types can't see at compile time. **A new custodian's
  sandbox tests belong here, not in `test/integration/`** — even when the suite
  also round-trips through the testnet, as the Palisade and AWS KMS ones do.
  - Named `<backend>.contract.test.ts`.
  - Each suite is gated on its own credentials and self-skips when they're
    absent, so the tier is safe to run anywhere. Add new credentials to the
    `contract-tests` job in `.github/workflows/ci.yml`, which runs the whole
    tier on merge to main, tags, and manual dispatch — never on PRs, since fork
    PRs get no secrets.

Helpers shared across tiers live in `test/helpers/` (e.g. `testnet.ts`, used by
both the integration and contract tiers); tier-local helpers stay in that tier's
own `helpers/` directory.

## Conventions

- Prettier: no semicolons, single quotes, trailing commas, 80 cols.
- ESLint flat config (`eslint.config.mjs`), type-aware; `src/generated/` ignored.
- Never commit credentials. `.env`, `*.pem`, and seeds are git-ignored.
