import { SimpleXRPLError } from '../../../errors.js'
import { CUSTODY_CAPABILITIES } from '../../../generated/custody-capabilities.js'
import type { KnownCustodyVersion } from '../../../generated/custody-capabilities.js'

/**
 * A Ripple Custody version to pin: a bundled minor version (`'1.43'`),
 * optionally with the patch level an instance reports (`'1.43.4'`). Patch
 * levels share their minor version's capability data.
 */
export type CustodyApiVersion =
  KnownCustodyVersion | `${KnownCustodyVersion}.${number}`

/** What one Ripple Custody version supports, as the version guard checks it. */
export interface CustodyCapabilities {
  /**
   * The resolved version: the instance's own `x-app-version` when detected
   * (e.g. `'1.43.4'`), or the pinned version.
   */
  readonly appVersion: string
  /** Whether this came from the live instance or a pinned version's bundled data. */
  readonly source: 'detected' | 'pinned'
  /** Served endpoints, normalized with {@link endpointKey}. */
  readonly endpoints: ReadonlySet<string>
  /** Accepted native XRPL operation types (e.g. `'TrustSet'`). */
  readonly xrplOperations: ReadonlySet<string>
  /** Accepted intent payload types (e.g. `'v0_CreateTransactionOrder'`). */
  readonly intentTypes: ReadonlySet<string>
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch'] as const

/**
 * Normalize an endpoint for comparison. Path parameter names vary between
 * versions (`{id}` vs `{accountId}`) without changing the route, and some
 * specs publish paths with a doubled leading slash — neither should make an
 * endpoint look unsupported.
 *
 * @param method - The HTTP method.
 * @param path - The path template.
 * @returns The comparison key, e.g. `GET /v1/domains/{}/accounts`.
 */
export function endpointKey(method: string, path: string): string {
  const shape = path.replace(/\/{2,}/gu, '/').replace(/\{[^}]+\}/gu, '{}')
  return `${method.toUpperCase()} ${shape}`
}

/** A schema's `type` property, as discriminated union members declare it. */
interface TypedProperties {
  readonly type?: { readonly enum?: readonly unknown[] }
}

/** A `oneOf` union schema, as capability extraction reads it. */
interface UnionSchema {
  readonly discriminator?: {
    readonly mapping?: Readonly<Record<string, string>>
  }
  readonly oneOf?: ReadonlyArray<{
    readonly $ref?: string
    readonly properties?: TypedProperties
  }>
  readonly properties?: TypedProperties
}

type SchemaMap = Readonly<Record<string, UnionSchema | undefined>>

/**
 * The parts of a Custody OpenAPI document capability extraction reads. Every
 * field is optional: the document comes from the instance, not the SDK.
 */
interface OpenApiDocument {
  readonly info?: { readonly 'x-app-version'?: unknown }
  readonly paths?: Readonly<
    Record<string, Readonly<Record<string, unknown>> | null | undefined>
  >
  readonly components?: { readonly schemas?: SchemaMap }
}

/**
 * View an untrusted parsed document through {@link OpenApiDocument}.
 *
 * @param spec - The parsed document.
 * @returns The document, or an empty one when `spec` isn't an object.
 */
function asDocument(spec: unknown): OpenApiDocument {
  // Every field is optional, so any object qualifies; each is checked where read.
  return typeof spec === 'object' && spec !== null ? spec : {}
}

/**
 * Sort comparator for plain strings.
 *
 * @param left - The first string.
 * @param right - The second string.
 * @returns Negative, zero, or positive, per `localeCompare`.
 */
function byCodeUnit(left: string, right: string): number {
  return left.localeCompare(right)
}

/**
 * The discriminator values of a `oneOf` union schema: its `mapping` keys, or —
 * for specs that publish the union without a mapping — each member's `type`
 * enum.
 *
 * @param schemas - The spec's component schemas.
 * @param name - The union schema's name.
 * @returns The union's type values (empty when the schema is absent).
 */
function unionTypes(schemas: SchemaMap, name: string): string[] {
  const union = schemas[name]
  const mapping = union?.discriminator?.mapping
  if (mapping !== undefined) {
    return Object.keys(mapping)
  }
  return (union?.oneOf ?? []).flatMap((member) => {
    const target =
      member.$ref === undefined
        ? member
        : schemas[member.$ref.split('/').pop() ?? '']
    return (target?.properties?.type?.enum ?? []).filter(
      (value): value is string => typeof value === 'string',
    )
  })
}

/**
 * Derive the raw capability lists from a Custody OpenAPI document. Mirrors
 * `extractCapabilities` in scripts/lib/custody-docs.mjs, which builds the
 * bundled data; a unit test keeps the two in step.
 *
 * @param spec - A parsed Custody OpenAPI document.
 * @returns The endpoints (`METHOD /path`), XRPL operation types, and intent types.
 */
export function extractCapabilityLists(spec: unknown): {
  endpoints: string[]
  xrplOperations: string[]
  intentTypes: string[]
} {
  const doc = asDocument(spec)
  const endpoints = Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
    HTTP_METHODS.filter((method) => item?.[method] !== undefined).map(
      (method) => `${method.toUpperCase()} ${path}`,
    ),
  )
  const schemas = doc.components?.schemas ?? {}
  return {
    endpoints: endpoints.sort(byCodeUnit),
    xrplOperations: unionTypes(schemas, 'Core_XrplOperation').sort(byCodeUnit),
    intentTypes: unionTypes(schemas, 'Core_ProposeUserIntentPayload').sort(
      byCodeUnit,
    ),
  }
}

/**
 * Build the capability set for raw lists.
 *
 * @param appVersion - The version the lists describe.
 * @param source - Where the lists came from.
 * @param lists - The raw capability lists.
 * @param lists.endpoints - Endpoints as `METHOD /path`.
 * @param lists.xrplOperations - XRPL operation types.
 * @param lists.intentTypes - Intent payload types.
 * @returns The capability set.
 */
function toCapabilities(
  appVersion: string,
  source: CustodyCapabilities['source'],
  lists: {
    readonly endpoints: readonly string[]
    readonly xrplOperations: readonly string[]
    readonly intentTypes: readonly string[]
  },
): CustodyCapabilities {
  return {
    appVersion,
    source,
    endpoints: new Set(
      lists.endpoints.map((entry) => {
        const [method, path] = entry.split(' ')
        return endpointKey(method, path)
      }),
    ),
    xrplOperations: new Set(lists.xrplOperations),
    intentTypes: new Set(lists.intentTypes),
  }
}

/**
 * Derive a live instance's capabilities from the OpenAPI document it serves —
 * exact for that instance, including versions with no bundled data.
 *
 * @param spec - The instance's parsed OpenAPI document.
 * @returns The detected capabilities.
 * @throws {@link SimpleXRPLError} if the document has no paths (not a Custody spec).
 */
export function detectedCapabilities(spec: unknown): CustodyCapabilities {
  const lists = extractCapabilityLists(spec)
  if (lists.endpoints.length === 0) {
    throw new SimpleXRPLError('The Custody OpenAPI document lists no endpoints')
  }
  const version = asDocument(spec).info?.['x-app-version']
  return toCapabilities(
    typeof version === 'string' ? version : 'unknown',
    'detected',
    lists,
  )
}

/**
 * Whether bundled capability data exists for a minor version.
 *
 * @param version - A minor version, e.g. `'1.43'`.
 * @returns `true` if the version is bundled.
 */
function isKnownVersion(version: string): version is KnownCustodyVersion {
  return Object.hasOwn(CUSTODY_CAPABILITIES, version)
}

/**
 * The bundled capabilities for a pinned version.
 *
 * @param version - A bundled version, optionally with a patch level.
 * @returns The pinned capabilities.
 * @throws {@link SimpleXRPLError} if the version has no bundled data.
 */
export function pinnedCapabilities(version: string): CustodyCapabilities {
  const minor = /^(?<minor>\d+\.\d+)(?:\.\d+)?$/u.exec(version)?.groups?.minor
  if (minor === undefined || !isKnownVersion(minor)) {
    throw new SimpleXRPLError(
      `Unknown Ripple Custody apiVersion '${version}'. Known versions: ${Object.keys(CUSTODY_CAPABILITIES).join(', ')}.`,
    )
  }
  return toCapabilities(version, 'pinned', CUSTODY_CAPABILITIES[minor])
}
