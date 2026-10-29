// Vendors the Ripple Custody OpenAPI spec published with the Custody product
// docs into openapi/custody-openapi.json. Without `--version`, it takes the
// docs' current default version (`default:` in versions.yaml), so a daily run
// tracks whatever the docs publish as current.
//
// The file is written byte-for-byte as published, and only when it differs from
// the vendored copy — a re-published spec under an unchanged version is picked
// up too. Moving the pin to an older version is refused unless that version was
// asked for explicitly, so a docs rollback never silently downgrades the SDK.
//
// Usage:
//   node scripts/fetch-custody-spec.mjs [--version vX.Y]
//
// Environment:
//   CUSTODY_SPEC_GITLAB_TOKEN    GitLab token with `read_api` on the docs project
//   CUSTODY_SPEC_GITLAB_PROJECT  The docs project's path (`group/.../project`)
//   CUSTODY_SPEC_GITLAB_URL      GitLab base URL (default: https://gitlab.com)
//   CUSTODY_SPEC_GITLAB_REF      Branch or tag to read (default: project default)
//
// In GitHub Actions it also writes `changed`, `version`, `app-version` and
// `previous-app-version` to $GITHUB_OUTPUT.
//
// Next step after an update: `npm run typegen`.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VENDORED_SPEC = join(ROOT, 'openapi/custody-openapi.json')

const DOCS_ROOT = 'products/custody'
const VERSIONS_FILE = `${DOCS_ROOT}/versions.yaml`
const specPathFor = (version) =>
  `${DOCS_ROOT}/@${version}/reference/api/openapi.json`

const VERSION_PATTERN = /^v\d+\.\d+(?:\.\d+)?$/u

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. See openapi/README.md.`)
  }
  return value
}

/** A read-only client for the docs project, configured from the environment. */
function createGitlab() {
  const baseUrl = (
    process.env.CUSTODY_SPEC_GITLAB_URL ?? 'https://gitlab.com'
  ).replace(/\/+$/u, '')
  const token = requireEnv('CUSTODY_SPEC_GITLAB_TOKEN')
  const project = encodeURIComponent(requireEnv('CUSTODY_SPEC_GITLAB_PROJECT'))

  async function get(path) {
    const url = `${baseUrl}/api/v4/projects/${project}${path}`
    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } })
    if (!res.ok) {
      // The URL embeds only the project path, never the token, so it is safe
      // to print — and naming it is what makes a 404 diagnosable.
      const hint =
        res.status === 401 || res.status === 403
          ? ' — check the token is valid and has read_api access to the project'
          : res.status === 404
            ? ' — check the project path, the ref, and that the version exists'
            : ''
      throw new Error(`GitLab request failed (${res.status}): ${url}${hint}`)
    }
    return res
  }

  return {
    async readFile(path, ref) {
      const res = await get(
        `/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref)}`,
      )
      return res.text()
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

function parseDefaultVersion(versionsYaml) {
  const match = /^default:\s*['"]?([^'"\s#]+)/mu.exec(versionsYaml)
  if (!match) {
    throw new Error(`No \`default:\` version found in ${VERSIONS_FILE}`)
  }
  return match[1]
}

/** Numeric comparison of dotted versions (`1.43` vs `1.43.2`). */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function externalRefs(node, found = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) externalRefs(item, found)
  } else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (
        key === '$ref' &&
        typeof value === 'string' &&
        !value.startsWith('#')
      ) {
        found.add(value)
      } else {
        externalRefs(value, found)
      }
    }
  }
  return found
}

/**
 * Check the downloaded document is the spec for `version` and can be vendored
 * as a single file. Returns its `info.x-app-version`.
 */
function validateSpec(body, version) {
  let doc
  try {
    doc = JSON.parse(body)
  } catch {
    throw new Error(`The ${version} spec is not valid JSON`)
  }
  if (typeof doc.openapi !== 'string' || !doc.openapi.startsWith('3.')) {
    throw new Error(`The ${version} spec is not an OpenAPI 3 document`)
  }
  const appVersion = doc.info?.['x-app-version']
  if (typeof appVersion !== 'string') {
    throw new Error(`The ${version} spec has no info.x-app-version`)
  }
  const expected = version.slice(1)
  if (appVersion !== expected && !appVersion.startsWith(`${expected}.`)) {
    throw new Error(
      `The ${version} spec reports x-app-version ${appVersion}; refusing to vendor a mismatched spec`,
    )
  }
  // typegen and the route generator read one file; a split spec would need its
  // referenced files vendored alongside it.
  const refs = externalRefs(doc)
  if (refs.size > 0) {
    throw new Error(
      `The ${version} spec references external files (${[...refs].join(', ')}); only single-file specs can be vendored`,
    )
  }
  return appVersion
}

function readVendoredSpec() {
  try {
    const body = readFileSync(VENDORED_SPEC, 'utf8')
    return { body, appVersion: JSON.parse(body).info?.['x-app-version'] }
  } catch {
    return { body: undefined, appVersion: undefined }
  }
}

function setOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return
  const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v ?? ''}`)
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`)
}

async function main() {
  const { values } = parseArgs({ options: { version: { type: 'string' } } })
  const gitlab = createGitlab()
  const ref = await gitlab.resolveRef()

  const version =
    values.version ??
    parseDefaultVersion(await gitlab.readFile(VERSIONS_FILE, ref))
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid version '${version}' (expected e.g. v1.43)`)
  }

  const body = await gitlab.readFile(specPathFor(version), ref)
  const appVersion = validateSpec(body, version)
  const current = readVendoredSpec()

  if (body === current.body) {
    console.log(`Custody spec is up to date (${version}).`)
    setOutputs({ changed: 'false', version, 'app-version': appVersion })
    return
  }

  if (
    values.version === undefined &&
    current.appVersion !== undefined &&
    compareVersions(appVersion, current.appVersion) < 0
  ) {
    throw new Error(
      `The docs' default version (${appVersion}) is older than the pinned spec (${current.appVersion}); ` +
        'pass --version explicitly to downgrade.',
    )
  }

  writeFileSync(VENDORED_SPEC, body)
  console.log(
    `Updated openapi/custody-openapi.json: ${current.appVersion ?? 'none'} → ${appVersion} (${version}). ` +
      'Next: npm run typegen',
  )
  setOutputs({
    changed: 'true',
    version,
    'app-version': appVersion,
    'previous-app-version': current.appVersion,
  })
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
