// The vendored Ripple Custody specs, organized on two axes:
//
//   channel — where a spec comes from:
//     official  a released Custody version
//     devbox    a pre-release feature build (e.g. confidential MPT)
//   surface — which API it describes:
//     public    the customer-facing API (/v1/…)
//     internal  the instance's internal API (/internal/v1/…, /api/notifications/…)
//
// Layout (anything else under openapi/custody/ is an error, so a misplaced spec
// can never be silently left out of generation):
//
//   openapi/custody/official/public.json           kept current by the daily workflow
//   openapi/custody/official/internal.json         fetched from a live instance
//   openapi/custody/devbox/<build>/public.json     fetched from a devbox instance
//   openapi/custody/devbox/<build>/internal.json
//   openapi/custody/capabilities.json              per-version data (official public)
//
// Spec files are vendored byte-for-byte as the server serves them.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export const CUSTODY_DIR = 'openapi/custody'
export const OFFICIAL_PUBLIC_SPEC = `${CUSTODY_DIR}/official/public.json`
export const CAPABILITIES_FILE = `${CUSTODY_DIR}/capabilities.json`

export const SURFACES = ['public', 'internal']
const SPEC_FILES = new Set(SURFACES.map((surface) => `${surface}.json`))
export const BUILD_NAME = /^[a-z0-9][a-z0-9.-]*$/u

/** Where a spec for `channel`/`surface` (and devbox `build`) lives. */
export function specPath(channel, surface, build) {
  return channel === 'official'
    ? `${CUSTODY_DIR}/official/${surface}.json`
    : `${CUSTODY_DIR}/devbox/${build}/${surface}.json`
}

function isDir(path) {
  return statSync(path).isDirectory()
}

function layoutError(root, path, why) {
  return new Error(`${relative(root, path)}: ${why}. See openapi/README.md.`)
}

function loadSpec(root, path, tags) {
  const doc = JSON.parse(readFileSync(path, 'utf8'))
  const appVersion = doc.info?.['x-app-version']
  if (typeof appVersion !== 'string') {
    throw layoutError(root, path, 'no info.x-app-version')
  }
  return { ...tags, path: relative(root, path), appVersion, doc }
}

/** Load a directory that may hold only `public.json` / `internal.json`. */
function loadSpecDir(root, dir, tags) {
  const specs = []
  for (const name of readdirSync(dir).sort()) {
    if (!SPEC_FILES.has(name)) {
      throw layoutError(
        root,
        join(dir, name),
        'unexpected entry (only public.json and internal.json belong here)',
      )
    }
    const surface = name.replace(/\.json$/u, '')
    specs.push(loadSpec(root, join(dir, name), { ...tags, surface }))
  }
  return specs
}

/**
 * Every vendored Custody spec, tagged with its channel, surface and (devbox)
 * build.
 *
 * @returns Array of `{ channel, build?, surface, path, appVersion, doc }`.
 * @throws on any file or folder outside the layout above.
 */
export function loadCustodySpecs(root) {
  const base = join(root, CUSTODY_DIR)
  const specs = []
  for (const name of readdirSync(base).sort()) {
    const path = join(base, name)
    if (name === 'capabilities.json') continue
    if (name === 'official' && isDir(path)) {
      specs.push(...loadSpecDir(root, path, { channel: 'official' }))
    } else if (name === 'devbox' && isDir(path)) {
      for (const build of readdirSync(path).sort()) {
        const buildDir = join(path, build)
        if (!BUILD_NAME.test(build) || !isDir(buildDir)) {
          throw layoutError(
            root,
            buildDir,
            'devbox builds are folders named like `cmpt` or `batch-2`',
          )
        }
        specs.push(...loadSpecDir(root, buildDir, { channel: 'devbox', build }))
      }
    } else {
      throw layoutError(root, path, 'unexpected entry')
    }
  }
  if (!specs.some((s) => s.channel === 'official' && s.surface === 'public')) {
    throw new Error(`${OFFICIAL_PUBLIC_SPEC} is missing`)
  }
  return specs
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])]),
  )
}

/**
 * The stored form of a document fetched from a live instance. Instances serve
 * the same document with `paths`, schemas and `tags` in a different order on
 * each request, so it is stored with object keys sorted and tags sorted by
 * name — otherwise every re-fetch would be a wall of diff noise. Content is
 * unchanged. (The docs-published official spec is vendored byte-for-byte.)
 */
export function normalizeInstanceDocument(doc) {
  const sorted = sortKeys(doc)
  if (Array.isArray(sorted.tags)) {
    sorted.tags = [...sorted.tags].sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    )
  }
  return sorted
}

/** Serialize a normalized instance document. */
export function serializeInstanceDocument(doc) {
  return `${JSON.stringify(normalizeInstanceDocument(doc), null, 2)}\n`
}

/**
 * Whether two instance documents describe the same API. Top-level `tags` are
 * ignored: instances serve tag metadata inconsistently between requests (a
 * description present on one response, absent on the next).
 */
export function sameInstanceDocument(left, right) {
  const strip = ({ tags, ...rest }) => rest
  return (
    JSON.stringify(normalizeInstanceDocument(strip(left))) ===
    JSON.stringify(normalizeInstanceDocument(strip(right)))
  )
}

/** Read a vendored spec, or `undefined` when it doesn't exist. */
export function readVendoredSpec(root, relativePath) {
  const path = join(root, relativePath)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined
}
