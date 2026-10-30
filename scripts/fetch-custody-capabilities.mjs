// Rebuilds openapi/custody-capabilities.json from every Ripple Custody version
// the docs publish a spec for: the endpoints, native XRPL operation types and
// intent payload types each version supports. This is the offline data a
// pinned `apiVersion` gates against; auto-detection reads the live instance
// spec instead and doesn't need it.
//
// The daily spec update keeps the current version's entry fresh on its own, so
// this full rebuild is only needed occasionally (e.g. after the docs republish
// an older version).
//
// Usage:
//   node scripts/fetch-custody-capabilities.mjs
//
// Environment: see scripts/lib/custody-docs.mjs (CUSTODY_SPEC_GITLAB_*).
//
// Next step: `npm run typegen`.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CAPABILITIES_FILE,
  VERSIONS_FILE,
  capabilityKey,
  createGitlab,
  extractCapabilities,
  parseAllVersions,
  readSpec,
  writeCapabilityData,
} from './lib/custody-docs.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const gitlab = createGitlab()
  const ref = await gitlab.resolveRef()
  const versions = parseAllVersions(await gitlab.readFile(VERSIONS_FILE, ref))

  const data = {}
  const missing = []
  for (const version of versions) {
    try {
      const { body } = await readSpec(gitlab, version, ref)
      data[capabilityKey(version)] = extractCapabilities(JSON.parse(body))
    } catch (err) {
      missing.push(`${version} (${err.message})`)
    }
  }
  if (Object.keys(data).length === 0) {
    throw new Error('No published specs found; refusing to write empty data')
  }

  writeCapabilityData(ROOT, data)
  console.log(
    `Wrote ${CAPABILITIES_FILE}: ${Object.keys(data).length} versions.` +
      (missing.length > 0 ? ` Skipped: ${missing.join('; ')}` : ''),
  )
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
