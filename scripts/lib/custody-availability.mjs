// Classifies every endpoint, native XRPL operation and intent type in the
// merged Custody API by where it is served: which official versions, and which
// devbox builds. Rendered twice — docs/custody-endpoints.md for readers, and
// src/generated/custody-availability.ts for UnsupportedInVersionError hints.

import { compareVersions, extractCapabilities } from './custody-docs.mjs'

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch']

/**
 * Endpoint comparison key; must match `endpointKey` in
 * src/custodians/ripple/versioning/capabilities.ts.
 */
export function endpointKey(method, path) {
  const shape = path.replace(/\/{2,}/gu, '/').replace(/\{[^}]+\}/gu, '{}')
  return `${method.toUpperCase()} ${shape}`
}

function keyOfEntry(entry) {
  const [method, path] = entry.split(' ')
  return endpointKey(method, path)
}

/**
 * `['1.15', '1.16', '1.18']` over all known versions → `'1.15–1.16, 1.18'`.
 * A run that reaches the newest known version is open-ended (`'1.37+'`), so
 * the next release doesn't rewrite every row that is still current.
 */
export function compressVersions(present, ordered) {
  const runs = []
  let run
  for (const version of ordered) {
    if (present.has(version)) {
      if (run === undefined) {
        run = [version, version]
        runs.push(run)
      } else {
        run[1] = version
      }
    } else {
      run = undefined
    }
  }
  const newest = ordered[ordered.length - 1]
  return runs
    .map(([first, last]) => {
      if (last === newest) return `${first}+`
      return first === last ? first : `${first}–${last}`
    })
    .join(', ')
}

/** `1.43.4` → `1.43`. */
export function minorOf(version) {
  return version.split('.').slice(0, 2).join('.')
}

/**
 * Build the classification.
 *
 * @param capabilities - The per-version official public data (capabilities.json).
 * @param specs - Tagged vendored specs (loadCustodySpecs).
 * @param merged - `{ public, internal }` merged documents.
 * @returns `{ endpoints, xrplOperations, intentTypes }`, each a sorted array of
 *   `{ key, operationId?, surface?, official, devbox }`.
 */
export function classify(capabilities, specs, merged) {
  const ordered = Object.keys(capabilities).sort(compareVersions)
  const officialPublic = (field, keyOf = (k) => k) => {
    const byKey = new Map()
    for (const version of ordered) {
      for (const entry of capabilities[version][field]) {
        const key = keyOf(entry)
        if (!byKey.has(key)) byKey.set(key, new Set())
        byKey.get(key).add(version)
      }
    }
    return (key) => compressVersions(byKey.get(key) ?? new Set(), ordered)
  }
  const officialInternal = specs.find(
    (s) => s.channel === 'official' && s.surface === 'internal',
  )
  const officialInternalKeys = new Set(
    officialInternal === undefined
      ? []
      : extractCapabilities(officialInternal.doc).endpoints.map(keyOfEntry),
  )
  const devbox = specs
    .filter((s) => s.channel === 'devbox')
    .map((s) => {
      const caps = extractCapabilities(s.doc)
      return {
        build: s.build,
        surface: s.surface,
        endpoints: new Set(caps.endpoints.map(keyOfEntry)),
        xrplOperations: new Set(caps.xrplOperations),
        intentTypes: new Set(caps.intentTypes),
      }
    })
  const devboxBuilds = (field, key, surface) =>
    [
      ...new Set(
        devbox
          .filter(
            (d) =>
              (surface === undefined || d.surface === surface) &&
              d[field].has(key),
          )
          .map((d) => d.build),
      ),
    ].sort()

  const publicEndpointVersions = officialPublic('endpoints', keyOfEntry)
  const endpoints = []
  for (const surface of ['public', 'internal']) {
    const doc = merged[surface]
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
      for (const method of HTTP_METHODS) {
        const op = item?.[method]
        if (op === undefined) continue
        const key = endpointKey(method, path)
        endpoints.push({
          key: `${method.toUpperCase()} ${path}`,
          normalizedKey: key,
          operationId: op.operationId,
          surface,
          official:
            surface === 'public'
              ? publicEndpointVersions(key)
              : officialInternalKeys.has(key)
                ? `${minorOf(officialInternal.appVersion)}+`
                : '',
          devbox: devboxBuilds('endpoints', key, surface),
        })
      }
    }
  }
  endpoints.sort((a, b) => a.key.localeCompare(b.key))

  const mergedCaps = extractCapabilities(merged.public)
  const byName = (field) => {
    const versions = officialPublic(field)
    return mergedCaps[field].map((name) => ({
      key: name,
      official: versions(name),
      devbox: devboxBuilds(field, name, 'public'),
    }))
  }
  return {
    endpoints,
    xrplOperations: byName('xrplOperations'),
    intentTypes: byName('intentTypes'),
  }
}

/** Render src/generated/custody-availability.ts. */
export function renderAvailabilityModule(classification) {
  const table = (rows, keyOf) =>
    Object.fromEntries(
      rows.map((row) => [
        keyOf(row),
        {
          ...(row.official === '' ? {} : { official: row.official }),
          ...(row.devbox.length === 0 ? {} : { devbox: row.devbox }),
        },
      ]),
    )
  const data = {
    endpoints: table(classification.endpoints, (row) => row.normalizedKey),
    xrplOperations: table(classification.xrplOperations, (row) => row.key),
    intentTypes: table(classification.intentTypes, (row) => row.key),
  }
  return `/**
 * This file was auto-generated by scripts/gen-custody-types.mjs.
 * Do not make direct changes to the file. Regenerate with \`npm run typegen\`.
 *
 * Where each Custody endpoint (keyed as \`METHOD /path\` with parameters
 * normalized to \`{}\`), native XRPL operation and intent type is served:
 * \`official\` lists the official versions, \`devbox\` the devbox builds.
 * Used to hint at alternatives in UnsupportedInVersionError.
 */

export interface CustodyAvailability {
  readonly official?: string
  readonly devbox?: readonly string[]
}

export const CUSTODY_AVAILABILITY: {
  readonly endpoints: Readonly<Record<string, CustodyAvailability>>
  readonly xrplOperations: Readonly<Record<string, CustodyAvailability>>
  readonly intentTypes: Readonly<Record<string, CustodyAvailability>>
} = ${JSON.stringify(data, null, 2)}
`
}

/** Render docs/custody-endpoints.md. */
export function renderAvailabilityDoc(classification) {
  const cell = (value) => (value === '' || value === undefined ? '—' : value)
  const endpointRows = (surface) =>
    classification.endpoints
      .filter((row) => row.surface === surface)
      .map(
        (row) =>
          `| \`${row.key}\` | ${row.operationId === undefined ? '—' : `\`${row.operationId}\``} | ${cell(row.official)} | ${cell(row.devbox.join(', '))} |`,
      )
      .join('\n')
  const nameRows = (rows) =>
    rows
      .map(
        (row) =>
          `| \`${row.key}\` | ${cell(row.official)} | ${cell(row.devbox.join(', '))} |`,
      )
      .join('\n')
  return `# Ripple Custody API availability

<!-- GENERATED by scripts/gen-custody-types.mjs — do not edit by hand.
     Regenerate with \`npm run typegen\`. -->

Where each part of the Ripple Custody API the SDK knows about is served.
**Official** lists the released Custody versions that serve it (public API:
every version the Custody docs publish a spec for; internal API: the vendored
official internal spec). **Devbox** lists the vendored pre-release builds that
serve it.

At runtime the SDK checks calls against the instance's own version, so this
table is for planning — see the README's "Ripple Custody versions" section.

Endpoints without an operationId are typed but not callable by name through
\`api.call\` / \`api.internal.call\`.

## Public API (\`custody.api.call\`)

| Endpoint | operationId | Official | Devbox |
| --- | --- | --- | --- |
${endpointRows('public')}

## Internal API (\`custody.api.internal.call\`)

| Endpoint | operationId | Official | Devbox |
| --- | --- | --- | --- |
${endpointRows('internal')}

## Native XRPL operations

| Operation | Official | Devbox |
| --- | --- | --- |
${nameRows(classification.xrplOperations)}

## Intent types (\`custody.api.propose\`)

| Intent type | Official | Devbox |
| --- | --- | --- |
${nameRows(classification.intentTypes)}
`
}
