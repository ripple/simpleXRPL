// Vendors the Ripple Custody OpenAPI spec published with the Custody product
// docs into openapi/custody-openapi.json, and records that version's
// capabilities in openapi/custody-capabilities.json. Without `--version`, it
// takes the docs' current default version (`default:` in versions.yaml), so a
// daily run tracks whatever the docs publish as current.
//
// The spec is written byte-for-byte as published, and only when it differs from
// the vendored copy — a re-published spec under an unchanged version is picked
// up too. Moving the pin to an older version is refused unless that version was
// asked for explicitly, so a docs rollback never silently downgrades the SDK.
//
// Usage:
//   node scripts/fetch-custody-spec.mjs [--version vX.Y]
//
// Environment: see scripts/lib/custody-docs.mjs (CUSTODY_SPEC_GITLAB_*).
//
// In GitHub Actions it also writes `changed`, `version`, `app-version` and
// `previous-app-version` to $GITHUB_OUTPUT.
//
// Next step after an update: `npm run typegen`.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import {
  VERSIONS_FILE,
  VERSION_PATTERN,
  capabilityKey,
  compareVersions,
  createGitlab,
  extractCapabilities,
  parseDefaultVersion,
  readCapabilityData,
  readSpec,
  serializeCapabilityData,
  writeCapabilityData,
} from './lib/custody-docs.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VENDORED_SPEC = join(ROOT, 'openapi/custody-openapi.json')

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
 * as a single file. Returns the parsed document and its `info.x-app-version`.
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
  return { doc, appVersion }
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

  const { body } = await readSpec(gitlab, version, ref)
  const { doc, appVersion } = validateSpec(body, version)
  const current = readVendoredSpec()
  const specChanged = body !== current.body

  if (
    specChanged &&
    values.version === undefined &&
    current.appVersion !== undefined &&
    compareVersions(appVersion, current.appVersion) < 0
  ) {
    throw new Error(
      `The docs' default version (${appVersion}) is older than the pinned spec (${current.appVersion}); ` +
        'pass --version explicitly to downgrade.',
    )
  }

  // Keep the per-version capability data in step with what the docs publish
  // for this version, whether or not the pinned spec itself moved.
  const capabilities = readCapabilityData(ROOT)
  const before = serializeCapabilityData(capabilities)
  capabilities[capabilityKey(version)] = extractCapabilities(doc)
  const capabilitiesChanged = serializeCapabilityData(capabilities) !== before
  if (capabilitiesChanged) {
    writeCapabilityData(ROOT, capabilities)
  }

  if (specChanged) {
    writeFileSync(VENDORED_SPEC, body)
    console.log(
      `Updated openapi/custody-openapi.json: ${current.appVersion ?? 'none'} → ${appVersion} (${version}). ` +
        'Next: npm run typegen',
    )
  } else {
    console.log(`Custody spec is up to date (${version}).`)
  }
  if (capabilitiesChanged) {
    console.log(`Updated ${version} in openapi/custody-capabilities.json.`)
  }

  setOutputs({
    changed: String(specChanged || capabilitiesChanged),
    version,
    'app-version': appVersion,
    'previous-app-version': current.appVersion,
  })
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
