// Shared access to the Ripple Custody specs published with the Custody product
// docs: a read-only GitLab client, the docs' version list, spec lookup across
// the docs' directory layouts, and capability extraction.
//
// Used by fetch-custody-spec.mjs (the pinned spec) and
// fetch-custody-capabilities.mjs (the per-version capability data).

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { CAPABILITIES_FILE } from './custody-specs.mjs'

const DOCS_ROOT = 'products/custody'
export const VERSIONS_FILE = `${DOCS_ROOT}/versions.yaml`

export const VERSION_PATTERN = /^v\d+\.\d+(?:\.\d+)?$/u

const HTTP_NOT_FOUND = 404

/**
 * Where a version's spec can live. Versions hidden from the docs site carry a
 * `_` prefix, and the docs moved from `api/reference/` to `reference/api/`
 * around v1.36 — so the spec is looked up in each layout in turn.
 */
function specPathsFor(version) {
  return [
    `${DOCS_ROOT}/@${version}/reference/api/openapi.json`,
    `${DOCS_ROOT}/_@${version}/reference/api/openapi.json`,
    `${DOCS_ROOT}/@${version}/api/reference/openapi.json`,
    `${DOCS_ROOT}/_@${version}/api/reference/openapi.json`,
  ]
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. See openapi/README.md.`)
  }
  return value
}

/** A read-only client for the docs project, configured from the environment. */
export function createGitlab() {
  const baseUrl = (
    process.env.CUSTODY_SPEC_GITLAB_URL ?? 'https://gitlab.com'
  ).replace(/\/+$/u, '')
  const token = requireEnv('CUSTODY_SPEC_GITLAB_TOKEN')
  const project = encodeURIComponent(requireEnv('CUSTODY_SPEC_GITLAB_PROJECT'))

  async function get(path, { allowNotFound = false } = {}) {
    const url = `${baseUrl}/api/v4/projects/${project}${path}`
    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } })
    if (allowNotFound && res.status === HTTP_NOT_FOUND) {
      return undefined
    }
    if (!res.ok) {
      // The URL embeds only the project path, never the token, so it is safe
      // to print — and naming it is what makes a 404 diagnosable.
      const hint =
        res.status === 401 || res.status === 403
          ? ' — check the token is valid and can read the project'
          : res.status === HTTP_NOT_FOUND
            ? ' — check the project path, the ref, and that the version exists'
            : ''
      throw new Error(`GitLab request failed (${res.status}): ${url}${hint}`)
    }
    return res
  }

  const rawPath = (path, ref) =>
    `/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref)}`

  return {
    async readFile(path, ref) {
      return (await get(rawPath(path, ref))).text()
    },
    /** Like {@link readFile}, but resolves `undefined` for a missing file. */
    async tryReadFile(path, ref) {
      const res = await get(rawPath(path, ref), { allowNotFound: true })
      return res === undefined ? undefined : res.text()
    },
    async resolveRef() {
      if (process.env.CUSTODY_SPEC_GITLAB_REF) {
        return process.env.CUSTODY_SPEC_GITLAB_REF
      }
      const { default_branch: defaultBranch } = await (await get('')).json()
      return defaultBranch
    },
  }
}

/** The docs' current default version (`default:` in versions.yaml). */
export function parseDefaultVersion(versionsYaml) {
  const match = /^default:\s*['"]?([^'"\s#]+)/mu.exec(versionsYaml)
  if (!match) {
    throw new Error(`No \`default:\` version found in ${VERSIONS_FILE}`)
  }
  return match[1]
}

/**
 * Every version versions.yaml names — including the commented-out entries,
 * which are versions hidden from the docs site whose specs are still published.
 */
export function parseAllVersions(versionsYaml) {
  const versions = new Set()
  for (const match of versionsYaml.matchAll(
    /^[\s#-]*version:\s*['"]?(v\d+\.\d+(?:\.\d+)?)/gmu,
  )) {
    versions.add(match[1])
  }
  return [...versions]
}

/**
 * Download the spec published for `version`, trying each docs layout.
 *
 * @returns `{ body, path }` — the spec text and where it was found.
 * @throws if no layout has a spec for the version.
 */
export async function readSpec(gitlab, version, ref) {
  for (const path of specPathsFor(version)) {
    const body = await gitlab.tryReadFile(path, ref)
    if (body !== undefined) {
      return { body, path }
    }
  }
  throw new Error(`No published spec found for ${version}`)
}

/** Numeric comparison of dotted versions (`1.43` vs `1.43.2`). */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch']

/**
 * The discriminator values of a `oneOf` union schema: its `mapping` keys, or —
 * for specs that publish the union without a mapping — each member's `type`
 * enum.
 */
function unionTypes(schemas, name) {
  const union = schemas[name]
  if (union === undefined) return []
  const mapping = union.discriminator?.mapping
  if (mapping !== undefined) return Object.keys(mapping)
  const types = []
  for (const member of union.oneOf ?? []) {
    const target = member.$ref ? schemas[member.$ref.split('/').pop()] : member
    types.push(...(target?.properties?.type?.enum ?? []))
  }
  return types
}

/**
 * What a Custody spec supports, as the SDK gates it: every `METHOD /path` it
 * serves, the native XRPL operation types it accepts, and the intent payload
 * types it accepts. Must stay in step with `extractCapabilities` in
 * src/custodians/ripple/versioning/capabilities.ts — a unit test compares the
 * two on the vendored spec.
 */
export function extractCapabilities(doc) {
  const endpoints = []
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (item?.[method] !== undefined) {
        endpoints.push(`${method.toUpperCase()} ${path}`)
      }
    }
  }
  const schemas = doc.components?.schemas ?? {}
  return {
    endpoints: endpoints.sort(),
    xrplOperations: unionTypes(schemas, 'Core_XrplOperation').sort(),
    intentTypes: unionTypes(schemas, 'Core_ProposeUserIntentPayload').sort(),
  }
}

/**
 * `v1.43` (or `v1.43.2`) → `1.43`: the key capability data is stored under.
 * Entries are per minor version, which is what a pinned `apiVersion` resolves
 * to; a patch-level docs version shares its minor's entry.
 */
export function capabilityKey(version) {
  return version.replace(/^v/u, '').split('.').slice(0, 2).join('.')
}

/**
 * The vendored per-version capability data, `{ "1.43": { endpoints,
 * xrplOperations, intentTypes }, … }`, for the official public API.
 * `npm run typegen` turns it into src/generated/custody-capabilities.ts.
 */
export { CAPABILITIES_FILE }

export function readCapabilityData(root) {
  try {
    return JSON.parse(readFileSync(join(root, CAPABILITIES_FILE), 'utf8'))
  } catch {
    return {}
  }
}

/** Serialize with versions in ascending order, so diffs stay minimal. */
export function serializeCapabilityData(data) {
  const ordered = Object.fromEntries(
    Object.keys(data)
      .sort(compareVersions)
      .map((key) => [key, data[key]]),
  )
  return `${JSON.stringify(ordered, null, 2)}\n`
}

export function writeCapabilityData(root, data) {
  writeFileSync(join(root, CAPABILITIES_FILE), serializeCapabilityData(data))
}
