# Vendored OpenAPI specs

These are the pinned upstream contracts the custodian adapters are typed
against. `npm run typegen` runs `openapi-typescript` over each one and writes
`src/generated/{custody,palisade}.ts`. The compiler then checks every adapter
mapping against the real contract, so an API change surfaces as a type error
rather than a silent drift.

| File / folder | Upstream source | Version |
| --- | --- | --- |
| `custody/official/public.json` | Custody product docs: `products/custody/@<version>/reference/api/openapi.json` | the file's `info.x-app-version` |
| `custody/official/internal.json` | A live official instance (`npm run fetch:custody-instance-spec`) | the file's `info.x-app-version` |
| `custody/devbox/<build>/{public,internal}.json` | A live devbox instance (`npm run fetch:custody-instance-spec`) | the files' `info.x-app-version` |
| `custody/capabilities.json` | Derived from every spec the Custody docs publish (1.15 onward) | one entry per minor version |
| `palisade-api.yaml` | `ripplenet-docs/products/wallet/api-docs/palisade-api/palisade-api.yaml` | Palisade v2.0 |

## Ripple Custody: channels and surfaces

Custody specs are organized on two axes, by folder:

- **Channel** — where a spec comes from. `official` is a released Custody
  version; `devbox/<build>` is a pre-release feature build (e.g. `cmpt`,
  confidential MPT), which can carry APIs no official release has yet.
- **Surface** — which API it describes. `public.json` is the customer-facing
  API (`/v1/…`); `internal.json` is the instance's internal API
  (`/internal/v1/…`, `/api/notifications/…`), a separate API whose operationIds
  overlap the public one's.

`npm run typegen` (`scripts/gen-custody-types.mjs`) merges each surface's specs
and generates its types and route map:

| Surface | Types | Routes | SDK entry point |
| --- | --- | --- | --- |
| public | `src/generated/custody.ts` | `custody-routes.ts` | `custody.api.call` / `api.propose` |
| internal | `src/generated/custody-internal.ts` | `custody-internal-routes.ts` | `custody.api.internal.call` |

**The merge.** The official spec is the base and is authoritative. Devbox specs
are merged in strictly additively: they can add paths, operations, schemas,
union members, enum values, and properties (always optional). They never change
anything the official spec defines, so a devbox build can't reshape a type that
official instances are checked against. An added operation whose operationId is
already taken keeps its types but isn't routable by name. `npm run typegen`
prints what each surface's merge added.

The SDK still checks every call against the instance it's talking to (see
"Ripple Custody versions" in the main README). A devbox-only endpoint on an
official instance is blocked with an `UnsupportedInVersionError`.

**Availability.** `npm run typegen` also writes `docs/custody-endpoints.md`:
every endpoint, native XRPL operation and intent type, with the official
versions and devbox builds that serve it. The same data adds an "available in…"
hint to `UnsupportedInVersionError`.

The layout is strict: anything else under `openapi/custody/` fails generation,
so a misplaced spec is never silently left out.

### Devbox and internal specs

Neither is published with the Custody docs; they come from a live instance,
which serves both documents without authentication:

```sh
# a devbox build: writes custody/devbox/<build>/public.json and internal.json
npm run fetch:custody-instance-spec -- --gateway https://<devbox-gateway> --channel devbox --build cmpt
# an official instance's internal API: writes custody/official/internal.json
npm run fetch:custody-instance-spec -- --gateway https://<gateway> --channel official
npm run typegen && npm run typecheck
```

Instances serve these documents in a varying order (paths, schemas, tags), so
they're stored with keys sorted; a re-fetch only rewrites a file when the API it
describes changed. The gateway URL is never written to the repo. To drop a
devbox build, delete its folder and run `npm run typegen`.

## Ripple Custody: automated updates

The official public spec keeps one stable path, so moving to a new version
changes only the file's contents. Its version is whatever `info.x-app-version`
says.

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

| Secret | Purpose |
| --- | --- |
| `CUSTODY_SPEC_GITLAB_TOKEN` | GitLab token that can read the Custody docs project (`read_api`, or `read_repository` with `CUSTODY_SPEC_GITLAB_REF` set) |
| `CUSTODY_SPEC_GITLAB_PROJECT` | That project's path (`group/.../project`), kept out of this repo |
| `CUSTODY_SPEC_GITLAB_REF` | Optional. The docs branch to read; when set, a token with only `read_repository` is enough |
| `SPEC_UPDATE_PR_TOKEN` | Optional. PRs opened with the default `GITHUB_TOKEN` don't trigger CI; a token with contents + pull-requests write makes CI run on the PR |

### Updating by hand

```sh
export CUSTODY_SPEC_GITLAB_TOKEN=...   # can read the docs project
export CUSTODY_SPEC_GITLAB_PROJECT=... # the docs project's path
npm run fetch:custody-spec            # the docs' default version
npm run fetch:custody-spec -- --version v1.44
npm run typegen && npm run typecheck
```

The fetch refuses a spec whose `x-app-version` doesn't match the requested
version, a spec that `$ref`s external files, and — unless `--version` is passed —
a default version older than the one already pinned.

### Per-version capability data

`custody/capabilities.json` records, for each Custody version the docs publish a
spec for, the endpoints, native XRPL operation types and intent types it
supports. `npm run typegen` turns it into `src/generated/custody-capabilities.ts`,
which a pinned `apiVersion` checks calls against. (Auto-detection reads the
instance's own spec and doesn't use it.) It covers the official public API only:
a pinned version leaves internal calls unchecked, and devbox builds are served
by auto-detection.

The daily workflow refreshes the current version's entry along with the spec.
To rebuild every entry — e.g. after the docs republish an older version:

```sh
npm run fetch:custody-capabilities   # same CUSTODY_SPEC_GITLAB_* environment
npm run typegen
```

## Palisade: bumping a version

1. Replace `palisade-api.yaml` with the new spec (plus any files it `$ref`s),
   and update the pinned version in the table above.
2. Run `npm run typegen && npm run typecheck` — any mapping drift shows up as a
   type error to resolve before merging.
