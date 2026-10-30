import { SimpleXRPLError } from '../../../errors.js'
import type { CustodyHttpPort } from '../transport/http-port.js'

import { detectedCapabilities, pinnedCapabilities } from './capabilities.js'
import type { CustodyApiVersion, CustodyCapabilities } from './capabilities.js'
import { VersionGuard } from './version-guard.js'

/** The status at and above which an HTTP response is a failure. */
const HTTP_ERROR_THRESHOLD = 400

/**
 * How long a spec fetch may take. The documents are ~1 MB and detection is
 * best-effort, so a stalled gateway must not hold `create()` indefinitely.
 */
const DETECTION_TIMEOUT_MS = 15_000

/** Version-check options, shared by `RippleCustody.create` and `fromEnv`. */
export interface CustodyVersionOptions {
  /**
   * Pin the Ripple Custody version to check calls against, instead of
   * detecting it from the instance. Checked against data bundled with the SDK
   * (one entry per minor version), so no request is made for it.
   */
  readonly apiVersion?: CustodyApiVersion
  /**
   * Detect the instance's version from the OpenAPI document it serves, and
   * block calls it doesn't support. Ignored when `apiVersion` is set.
   *
   * @defaultValue `true`
   */
  readonly autoDetectVersion?: boolean
  /**
   * Where to fetch the instance's OpenAPI document during detection. Defaults
   * to `<gatewayUrl>/api/OpenAPI?scope=&layout=`. Must be HTTPS.
   */
  readonly openApiUrl?: string
}

/**
 * The default location of an instance's OpenAPI document. Both the public
 * (`scope` empty) and internal (`scope=internal`) documents are served without
 * authentication.
 *
 * @param gatewayUrl - The Custody gateway base URL.
 * @param scope - `''` for the public API, `'internal'` for the internal API.
 * @returns The document's URL.
 */
export function defaultOpenApiUrl(
  gatewayUrl: string,
  scope: '' | 'internal' = '',
): string {
  return `${gatewayUrl.replace(/\/+$/u, '')}/api/OpenAPI?scope=${scope}&layout=`
}

/**
 * Fetch and parse one OpenAPI document.
 *
 * @param http - The transport.
 * @param url - The document's URL.
 * @returns The parsed document.
 * @throws {@link SimpleXRPLError} if it can't be fetched or isn't JSON.
 */
async function fetchDocument(
  http: CustodyHttpPort,
  url: string,
): Promise<unknown> {
  const response = await http.send({
    method: 'GET',
    url,
    headers: { Accept: 'application/json' },
    timeoutMs: DETECTION_TIMEOUT_MS,
  })
  if (response.status >= HTTP_ERROR_THRESHOLD) {
    throw new SimpleXRPLError(`HTTP ${response.status}`)
  }
  try {
    return JSON.parse(response.body)
  } catch {
    throw new SimpleXRPLError('the response is not JSON')
  }
}

/**
 * Fetch an instance's OpenAPI document(s) and derive its capabilities. The
 * internal document is best-effort: when it can't be read, the internal API
 * is simply left unchecked.
 *
 * @param http - The transport.
 * @param url - The public document's URL.
 * @param internalUrl - The internal document's URL, if it should be read.
 * @returns The instance's capabilities.
 * @throws {@link SimpleXRPLError} if the public document can't be fetched or parsed.
 */
export async function detectCapabilities(
  http: CustodyHttpPort,
  url: string,
  internalUrl?: string,
): Promise<CustodyCapabilities> {
  const [spec, internalSpec] = await Promise.all([
    fetchDocument(http, url),
    internalUrl === undefined
      ? undefined
      : fetchDocument(http, internalUrl).catch(() => undefined),
  ])
  return detectedCapabilities(spec, internalSpec)
}

/**
 * Resolve the version guard for a new RippleCustody: a pinned `apiVersion`
 * first, then detection from the instance, otherwise a pass-through guard.
 *
 * Detection failing is not fatal — the instance may not expose its document —
 * so it warns once (Node `process.emitWarning`, code
 * `SIMPLEXRPL_CUSTODY_VERSION_UNDETECTED`) and lets calls through to the
 * server. Turning detection off with `autoDetectVersion: false` is a choice,
 * so it doesn't warn.
 *
 * @param options - The version options.
 * @param http - The transport.
 * @param gatewayUrl - The Custody gateway base URL.
 * @returns The guard.
 * @throws {@link SimpleXRPLError} for an unknown `apiVersion` or a non-HTTPS `openApiUrl`.
 */
export async function resolveVersionGuard(
  options: CustodyVersionOptions,
  http: CustodyHttpPort,
  gatewayUrl: string,
): Promise<VersionGuard> {
  if (options.apiVersion !== undefined) {
    return new VersionGuard(pinnedCapabilities(options.apiVersion))
  }
  if (options.autoDetectVersion === false) {
    return new VersionGuard(undefined)
  }
  const url = options.openApiUrl ?? defaultOpenApiUrl(gatewayUrl)
  if (!url.startsWith('https://')) {
    throw new SimpleXRPLError(`Custody openApiUrl must be HTTPS, got '${url}'`)
  }
  // A custom document URL says nothing about where the internal document
  // lives, so the internal API is only detected at the default location.
  const internalUrl =
    options.openApiUrl === undefined
      ? defaultOpenApiUrl(gatewayUrl, 'internal')
      : undefined
  try {
    return new VersionGuard(await detectCapabilities(http, url, internalUrl))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    process.emitWarning(
      `Could not detect the Ripple Custody version from ${url} (${reason}). ` +
        "Version checks are off, so a call the instance doesn't support fails " +
        'at the server instead. Pin a version with `apiVersion`, or set ' +
        '`autoDetectVersion: false` to skip detection.',
      {
        type: 'SimpleXRPLWarning',
        code: 'SIMPLEXRPL_CUSTODY_VERSION_UNDETECTED',
      },
    )
    return new VersionGuard(undefined)
  }
}
