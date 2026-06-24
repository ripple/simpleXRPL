# Vendored OpenAPI specs

These are the pinned upstream contracts the custodian adapters are typed
against. `npm run typegen` runs `openapi-typescript` over each one and writes
`src/generated/{custody,palisade}.ts`. The compiler then checks every adapter
mapping against the real contract, so an API change surfaces as a type error
rather than a silent drift.

| File                         | Upstream source                                                              | Pinned version |
| ---------------------------- | ---------------------------------------------------------------------------- | -------------- |
| `custody-v1.35-openapi.json` | `ripplenet-docs/products/custody/@v1.35/api/reference/openapi.json`          | Custody v1.35  |
| `palisade-api.yaml`          | `ripplenet-docs/products/wallet/api-docs/palisade-api/palisade-api.yaml`     | Palisade v2.0  |

`intent-structure.md` is a companion file the Custody spec `$ref`s for a tag
description; it must travel with the spec or `openapi-typescript` can't bundle.

## Bumping a version

1. Drop the new spec (plus any files it `$ref`s) in here under a version-stamped
   filename.
2. Update the `typegen:*` paths in `package.json` and the table above.
3. Run `npm run typegen && npm run typecheck` — any mapping drift shows up as a
   type error to resolve before merging.
