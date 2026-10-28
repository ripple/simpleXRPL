# Vendored OpenAPI specs

These are the pinned upstream contracts the custodian adapters are typed
against. `npm run typegen` runs `openapi-typescript` over each one and writes
`src/generated/{custody,palisade}.ts`. The compiler then checks every adapter
mapping against the real contract, so an API change surfaces as a type error
rather than a silent drift.

| File                         | Upstream source                                                              | Pinned version |
| ---------------------------- | ---------------------------------------------------------------------------- | -------------- |
| `custody-v1.43-openapi.json` | `ripplenet-docs/products/custody/@v1.43/reference/api/openapi.json`          | Custody v1.43  |
| `palisade-api.yaml`          | `ripplenet-docs/products/wallet/api-docs/palisade-api/palisade-api.yaml`     | Palisade v2.0  |

## Bumping a version

1. Drop the new spec (plus any files it `$ref`s) in here under a version-stamped
   filename.
2. Update the spec path in the `typegen:*` scripts in `package.json`,
   `scripts/gen-*-routes.mjs`, and `test/unit/custody-contract/spec-validator.ts`,
   and the table above.
3. Run `npm run typegen && npm run typecheck` — any mapping drift shows up as a
   type error to resolve before merging.
