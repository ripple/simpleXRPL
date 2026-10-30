// Vendors the OpenAPI documents a live Ripple Custody instance serves — its
// public API and its internal API — into openapi/custody/. This is how devbox
// builds and internal specs are obtained: neither is published with the Custody
// docs (the official public spec is, and the daily workflow keeps it current).
//
// The documents are served without authentication at
//   <gateway>/api/OpenAPI?scope=&layout=          (public)
//   <gateway>/api/OpenAPI?scope=internal&layout=  (internal)
// Instances serve these documents in a varying order, so they are stored
// normalized (keys sorted; see normalizeInstanceDocument), and an existing file
// is kept when the API it describes is unchanged. The gateway URL itself is
// never written.
//
// Usage:
//   node scripts/fetch-custody-instance-spec.mjs --gateway <url> --channel devbox --build <name>
//   node scripts/fetch-custody-instance-spec.mjs --gateway <url> --channel official
//
// With --channel official only the internal document is written: the official
// public spec comes from the docs (scripts/fetch-custody-spec.mjs).
//
// Next step: `npm run typegen`.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import {
  BUILD_NAME,
  readVendoredSpec,
  sameInstanceDocument,
  serializeInstanceDocument,
  specPath,
} from './lib/custody-specs.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const USAGE =
  'Usage: fetch-custody-instance-spec.mjs --gateway <https url> --channel <official|devbox> [--build <name>]'

function documentUrl(gateway, scope) {
  return `${gateway.replace(/\/+$/u, '')}/api/OpenAPI?scope=${scope}&layout=`
}

/** Fetch and sanity-check one document; returns its text and version. */
async function fetchDocument(gateway, scope) {
  const label = scope === '' ? 'public' : scope
  const res = await fetch(documentUrl(gateway, scope))
  if (!res.ok) {
    throw new Error(
      `The instance's ${label} document returned HTTP ${res.status}`,
    )
  }
  const body = await res.text()
  let doc
  try {
    doc = JSON.parse(body)
  } catch {
    throw new Error(`The instance's ${label} document is not JSON`)
  }
  if (typeof doc.openapi !== 'string' || !doc.openapi.startsWith('3.')) {
    throw new Error(`The instance's ${label} document is not OpenAPI 3`)
  }
  const appVersion = doc.info?.['x-app-version']
  if (typeof appVersion !== 'string') {
    throw new Error(
      `The instance's ${label} document has no info.x-app-version`,
    )
  }
  if (Object.keys(doc.paths ?? {}).length === 0) {
    throw new Error(`The instance's ${label} document lists no endpoints`)
  }
  return { doc, appVersion }
}

function parseOptions() {
  const { values } = parseArgs({
    options: {
      gateway: { type: 'string' },
      channel: { type: 'string' },
      build: { type: 'string' },
    },
  })
  const { gateway, channel, build } = values
  if (gateway === undefined || !gateway.startsWith('https://')) {
    throw new Error(`--gateway must be an https URL. ${USAGE}`)
  }
  if (channel !== 'official' && channel !== 'devbox') {
    throw new Error(`--channel must be official or devbox. ${USAGE}`)
  }
  if (
    channel === 'devbox' &&
    (build === undefined || !BUILD_NAME.test(build))
  ) {
    throw new Error(
      `--build is required for devbox, named like \`cmpt\` or \`batch-2\`. ${USAGE}`,
    )
  }
  if (channel === 'official' && build !== undefined) {
    throw new Error(`--build applies only to devbox. ${USAGE}`)
  }
  return { gateway, channel, build }
}

async function main() {
  const { gateway, channel, build } = parseOptions()
  const scopes = channel === 'official' ? ['internal'] : ['', 'internal']
  const documents = await Promise.all(
    scopes.map(async (scope) => ({
      surface: scope === '' ? 'public' : 'internal',
      ...(await fetchDocument(gateway, scope)),
    })),
  )
  for (const { surface, doc, appVersion } of documents) {
    const path = specPath(channel, surface, build)
    const existing = readVendoredSpec(ROOT, path)
    if (existing !== undefined && sameInstanceDocument(existing, doc)) {
      console.log(`${path} is up to date (x-app-version ${appVersion})`)
      continue
    }
    mkdirSync(dirname(join(ROOT, path)), { recursive: true })
    writeFileSync(join(ROOT, path), serializeInstanceDocument(doc))
    console.log(`Wrote ${path} (x-app-version ${appVersion})`)
  }
  console.log('Next: npm run typegen')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
