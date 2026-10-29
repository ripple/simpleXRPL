# Vendored OpenAPI specs

These are the pinned upstream contracts the custodian adapters are typed
against. `npm run typegen` runs `openapi-typescript` over each one and writes
`src/generated/{custody,palisade}.ts`. The compiler then checks every adapter
mapping against the real contract, so an API change surfaces as a type error
rather than a silent drift.

| File                   | Upstream source                                                          | Pinned version                    |
| ---------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| `custody-openapi.json` | Custody product docs: `products/custody/@<version>/reference/api/openapi.json` | the file's `info.x-app-version` |
| `palisade-api.yaml`    | `ripplenet-docs/products/wallet/api-docs/palisade-api/palisade-api.yaml` | Palisade v2.0                     |

## Ripple Custody: automated updates

The Custody spec keeps one stable filename, so moving to a new version changes
only the file's contents — no paths to update. Its version is whatever
`info.x-app-version` says.

The **Custody spec update** workflow (`.github/workflows/custody-spec-update.yml`)
runs daily. It reads the docs' current default version (`default:` in
`products/custody/versions.yaml`), and when the published spec differs from the
vendored one it vendors it, runs `npm run typegen`, and opens a PR on the
`automation/custody-spec-update` branch. The PR description reports whether
`npm run typecheck` and `npm test` pass, since a new spec can need adapter
changes. Push any fixes to that branch: the workflow leaves an open PR alone
while it carries the same spec.

It can also be run by hand from the Actions tab, optionally with a specific docs
version (e.g. `v1.44`).

The workflow needs these repository secrets:

| Secret                        | Purpose                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `CUSTODY_SPEC_GITLAB_TOKEN`   | GitLab token with `read_api` on the Custody docs project                                                                      |
| `CUSTODY_SPEC_GITLAB_PROJECT` | That project's path (`group/.../project`), kept out of this repo                                                              |
| `SPEC_UPDATE_PR_TOKEN`        | Optional. PRs opened with the default `GITHUB_TOKEN` don't trigger CI; a token with contents + pull-requests write makes CI run on the PR |

### Updating by hand

```sh
export CUSTODY_SPEC_GITLAB_TOKEN=...   # read_api on the docs project
export CUSTODY_SPEC_GITLAB_PROJECT=... # the docs project's path
npm run fetch:custody-spec            # the docs' default version
npm run fetch:custody-spec -- --version v1.44
npm run typegen && npm run typecheck
```

The fetch refuses a spec whose `x-app-version` doesn't match the requested
version, a spec that `$ref`s external files, and — unless `--version` is passed —
a default version older than the one already pinned.

## Palisade: bumping a version

1. Replace `palisade-api.yaml` with the new spec (plus any files it `$ref`s),
   and update the pinned version in the table above.
2. Run `npm run typegen && npm run typecheck` — any mapping drift shows up as a
   type error to resolve before merging.
