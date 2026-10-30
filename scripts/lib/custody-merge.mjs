// Merges the vendored Custody specs of one surface (public or internal) into a
// single document for type and route generation.
//
// The official spec is the base and is authoritative: its paths, operations
// and schemas are kept exactly as published. Devbox specs — pre-release
// feature builds, often older than the latest official release — are merged
// in strictly additively. They may add:
//
//   - paths, and operations on paths the official spec already has
//   - component entries (schemas, parameters, responses, …)
//   - members of a shared union schema (`oneOf` / `anyOf`, discriminator
//     mapping entries, `enum` values)
//   - properties on a shared object schema — never added to `required`, so
//     they type as optional
//
// They never change anything the official spec defines. A devbox build can
// make a shared field required, or reshape a schema, without that leaking into
// the types every official instance is checked against.
//
// An added operation whose `operationId` is already taken loses the id (it
// stays typed under `paths`, but isn't routable by name), so the route map
// never becomes ambiguous.

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'options',
  'head',
]
const UNION_KEYS = ['oneOf', 'anyOf']

/** Some specs publish paths with a doubled leading slash (`//v1/health`). */
function normalizePathKey(path) {
  return path.replace(/^\/{2,}/u, '/')
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function emptyReport(base) {
  return {
    base,
    additions: [],
    paths: 0,
    operations: 0,
    components: 0,
    unionMembers: 0,
    enumValues: 0,
    properties: 0,
    droppedOperationIds: [],
  }
}

function operationIds(paths) {
  const ids = new Set()
  for (const item of Object.values(paths)) {
    for (const method of HTTP_METHODS) {
      const id = item?.[method]?.operationId
      if (id !== undefined) ids.add(id)
    }
  }
  return ids
}

/** Clone an operation, dropping an `operationId` the merged document already uses. */
function claimOperation(operation, ids, report, where) {
  const copy = structuredClone(operation)
  if (copy.operationId === undefined) return copy
  if (ids.has(copy.operationId)) {
    report.droppedOperationIds.push(`${copy.operationId} (${where})`)
    delete copy.operationId
  } else {
    ids.add(copy.operationId)
  }
  return copy
}

function mergePaths(target, source, ids, report, label) {
  for (const [rawPath, item] of Object.entries(source ?? {})) {
    const path = normalizePathKey(rawPath)
    const existing = target[path]
    for (const method of HTTP_METHODS) {
      if (item?.[method] === undefined || existing?.[method] !== undefined) {
        continue
      }
      const where = `${method.toUpperCase()} ${path}`
      if (existing === undefined) {
        // A whole new path: carry its path-level fields (e.g. parameters) too.
        target[path] = { ...structuredClone(item) }
        for (const m of HTTP_METHODS) {
          if (item[m] !== undefined) {
            const at = `${m.toUpperCase()} ${path}`
            target[path][m] = claimOperation(item[m], ids, report, at)
          }
        }
        report.paths += 1
        report.additions.push(`${label}: path ${path}`)
        break
      }
      existing[method] = claimOperation(item[method], ids, report, where)
      report.operations += 1
      report.additions.push(`${label}: operation ${where}`)
    }
  }
}

/** Add `source`'s union members, enum values and properties to `target`, in place. */
function extendSchema(target, source, report, label) {
  for (const key of UNION_KEYS) {
    if (!Array.isArray(target[key]) || !Array.isArray(source[key])) continue
    for (const member of source[key]) {
      if (!target[key].some((existing) => same(existing, member))) {
        target[key].push(structuredClone(member))
        report.unionMembers += 1
        report.additions.push(
          `${label}: ${key} member ${member.$ref ?? '(inline)'}`,
        )
      }
    }
  }
  const targetMapping = target.discriminator?.mapping
  const sourceMapping = source.discriminator?.mapping
  if (targetMapping !== undefined && sourceMapping !== undefined) {
    for (const [value, ref] of Object.entries(sourceMapping)) {
      if (!(value in targetMapping)) targetMapping[value] = ref
    }
  }
  if (Array.isArray(target.enum) && Array.isArray(source.enum)) {
    for (const value of source.enum) {
      if (!target.enum.includes(value)) {
        target.enum.push(value)
        report.enumValues += 1
        report.additions.push(`${label}: enum value ${JSON.stringify(value)}`)
      }
    }
  }
  if (target.properties !== undefined && source.properties !== undefined) {
    for (const [name, schema] of Object.entries(source.properties)) {
      if (!(name in target.properties)) {
        target.properties[name] = structuredClone(schema)
        report.properties += 1
        report.additions.push(`${label}: optional property ${name}`)
      }
    }
  }
}

function mergeComponents(target, source, report, label) {
  for (const [section, entries] of Object.entries(source ?? {})) {
    target[section] ??= {}
    for (const [name, value] of Object.entries(entries ?? {})) {
      if (!(name in target[section])) {
        target[section][name] = structuredClone(value)
        report.components += 1
        report.additions.push(`${label}: ${section} ${name}`)
      } else if (section === 'schemas') {
        extendSchema(target[section][name], value, report, `${label}: ${name}`)
      }
    }
  }
}

/** Newest first, then by build name, so the merge order is deterministic. */
function byVersionDesc(left, right) {
  const pa = left.appVersion.split('.').map(Number)
  const pb = right.appVersion.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (diff !== 0) return diff
  }
  return (left.build ?? '').localeCompare(right.build ?? '')
}

function describe(spec) {
  return spec.channel === 'official'
    ? `official ${spec.appVersion}`
    : `devbox ${spec.build} ${spec.appVersion}`
}

/**
 * Merge one surface's specs.
 *
 * @param specs - Tagged specs (from loadCustodySpecs) for a single surface.
 * @returns `{ doc, report }`: the merged document and what the merge added.
 */
export function mergeSurface(specs) {
  if (specs.length === 0) {
    throw new Error('No specs to merge')
  }
  const official = specs.filter((s) => s.channel === 'official')
  if (official.length > 1) {
    throw new Error('Only one official spec per surface may be vendored')
  }
  const devbox = specs.filter((s) => s.channel === 'devbox').sort(byVersionDesc)
  // With no official spec for the surface, the newest devbox build stands in.
  const [base, ...rest] =
    official.length === 1 ? [official[0], ...devbox] : devbox

  const doc = structuredClone(base.doc)
  const report = emptyReport(describe(base))
  const basePaths = {}
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    basePaths[normalizePathKey(path)] ??= item
  }
  doc.paths = basePaths
  doc.components ??= {}
  const ids = operationIds(doc.paths)

  for (const spec of rest) {
    const label = describe(spec)
    mergePaths(doc.paths, spec.doc.paths, ids, report, label)
    mergeComponents(doc.components, spec.doc.components, report, label)
  }
  return { doc, report }
}

/** One-line summary of a merge report. */
export function summarize(surface, report) {
  const added = [
    `${report.paths} paths`,
    `${report.operations} operations`,
    `${report.components} components`,
    `${report.unionMembers} union members`,
    `${report.enumValues} enum values`,
    `${report.properties} optional properties`,
  ].join(', ')
  const dropped =
    report.droppedOperationIds.length > 0
      ? `; dropped colliding operationIds: ${report.droppedOperationIds.join(', ')}`
      : ''
  return `${surface}: base ${report.base}; devbox added ${added}${dropped}`
}
