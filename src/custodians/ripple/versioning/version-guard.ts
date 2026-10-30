import { UnsupportedInVersionError } from '../../../errors.js'
import { CUSTODY_AVAILABILITY } from '../../../generated/custody-availability.js'
import type { CustodyAvailability } from '../../../generated/custody-availability.js'

import { endpointKey } from './capabilities.js'
import type { CustodyCapabilities } from './capabilities.js'

/** One capability check, as {@link VersionGuard} runs it. */
interface CapabilityCheck {
  /** What kind of capability is being checked. */
  readonly kind: UnsupportedInVersionError['kind']
  /** The capability, as named in the error. */
  readonly capability: string
  /** The SDK call that needs it. */
  readonly sdkMethod: string
  /** Where the capability is served, for the error's hint. */
  readonly availability: CustodyAvailability | undefined
  /** An extra sentence explaining the gap, when the kind warrants one. */
  readonly detail?: (caps: CustodyCapabilities) => string | undefined
  /** Whether the resolved capabilities include it. */
  readonly isSupported: (caps: CustodyCapabilities) => boolean
}

/**
 * Describe where a capability is served, e.g. `official 1.37+` or
 * `pre-release Custody builds`. Devbox build names are an internal detail
 * (they're listed in docs/custody-endpoints.md), so they aren't named here.
 *
 * @param availability - The generated availability entry.
 * @returns The description, or `undefined` when nothing is known.
 */
function describeAvailability(
  availability: CustodyAvailability | undefined,
): string | undefined {
  const parts: string[] = []
  if (availability?.official !== undefined) {
    parts.push(`official ${availability.official}`)
  }
  if (availability?.devbox !== undefined) {
    parts.push('pre-release Custody builds')
  }
  return parts.length === 0 ? undefined : parts.join(' and ')
}

/**
 * Custody 1.23–1.31 model XRPL transaction orders as plain payments, with no
 * native operations at all — so a blocked operation there isn't a gap in one
 * operation but in the whole native path.
 */
const NO_NATIVE_OPERATIONS_DETAIL =
  'This version has no native XRPL operations: its transaction orders are ' +
  'plain payments, which the SDK does not build.'

/**
 * Blocks calls the resolved Ripple Custody version cannot serve, before they
 * reach the network, with an {@link UnsupportedInVersionError} naming what is
 * missing.
 *
 * Built without capabilities, it is a pass-through: no version could be
 * resolved (or detection was turned off), so every call goes to the server,
 * which remains the final authority.
 */
export class VersionGuard {
  private readonly capabilities: CustodyCapabilities | undefined

  /**
   * Construct a guard.
   *
   * @param capabilities - The resolved version's capabilities, or `undefined`
   *   for a pass-through guard.
   */
  public constructor(capabilities: CustodyCapabilities | undefined) {
    this.capabilities = capabilities
  }

  /**
   * The resolved version, or `undefined` when the guard is a pass-through.
   *
   * @returns The version string.
   */
  public get appVersion(): string | undefined {
    return this.capabilities?.appVersion
  }

  /**
   * Assert the version serves a public-API endpoint.
   *
   * @param method - The HTTP method.
   * @param pathTemplate - The path template (e.g. `/v1/domains/{domainId}`).
   * @param sdkMethod - The SDK call making it, for the error message.
   * @throws {@link UnsupportedInVersionError} if the endpoint is not served.
   */
  public assertEndpoint(
    method: string,
    pathTemplate: string,
    sdkMethod: string,
  ): void {
    this.checkEndpoint({ method, pathTemplate, sdkMethod }, (caps, key) =>
      caps.endpoints.has(key),
    )
  }

  /**
   * Assert the version serves an internal-API endpoint. Passes when the
   * instance's internal API wasn't resolved (a pinned version, or an instance
   * that doesn't serve its internal document).
   *
   * @param method - The HTTP method.
   * @param pathTemplate - The path template (e.g. `/internal/v1/users`).
   * @param sdkMethod - The SDK call making it, for the error message.
   * @throws {@link UnsupportedInVersionError} if the endpoint is not served.
   */
  public assertInternalEndpoint(
    method: string,
    pathTemplate: string,
    sdkMethod: string,
  ): void {
    this.checkEndpoint(
      { method, pathTemplate, sdkMethod },
      (caps, key) => caps.internalEndpoints?.has(key) ?? true,
    )
  }

  /**
   * Assert the version accepts a native XRPL operation type.
   *
   * @param operationType - The operation type (e.g. `'MPTokenIssuanceCreate'`).
   * @param sdkMethod - The SDK call making it, for the error message.
   * @throws {@link UnsupportedInVersionError} if the operation is not accepted.
   */
  public assertXrplOperation(operationType: string, sdkMethod: string): void {
    this.check({
      kind: 'xrplOperation',
      capability: operationType,
      sdkMethod,
      availability: CUSTODY_AVAILABILITY.xrplOperations[operationType],
      detail(caps) {
        return caps.xrplOperations.size === 0
          ? NO_NATIVE_OPERATIONS_DETAIL
          : undefined
      },
      isSupported: (caps) => caps.xrplOperations.has(operationType),
    })
  }

  /**
   * Assert the version accepts an intent payload type.
   *
   * @param intentType - The payload type (e.g. `'v0_ReleaseQuarantinedTransfers'`).
   * @param sdkMethod - The SDK call making it, for the error message.
   * @throws {@link UnsupportedInVersionError} if the intent type is not accepted.
   */
  public assertIntentType(intentType: string, sdkMethod: string): void {
    this.check({
      kind: 'intentType',
      capability: intentType,
      sdkMethod,
      availability: CUSTODY_AVAILABILITY.intentTypes[intentType],
      isSupported: (caps) => caps.intentTypes.has(intentType),
    })
  }

  /**
   * Assert the version can take a transactor as a native transaction order:
   * the `v0_CreateTransactionOrder` intent, carrying the Custody operation of
   * the same name.
   *
   * @param transactor - The XRPL transaction type.
   * @throws {@link UnsupportedInVersionError} if either is not accepted.
   */
  public assertNativeTransaction(transactor: string): void {
    const sdkMethod = `submitting ${transactor}`
    this.assertIntentType('v0_CreateTransactionOrder', sdkMethod)
    this.assertXrplOperation(transactor, sdkMethod)
  }

  /**
   * Assert the version can raw-sign: the `v0_SignManifest` intent.
   *
   * @param transactor - The XRPL transaction type being signed.
   * @throws {@link UnsupportedInVersionError} if the intent type is not accepted.
   */
  public assertRawSigning(transactor: string): void {
    this.assertIntentType('v0_SignManifest', `raw-signing ${transactor}`)
  }

  /**
   * Shared endpoint check for both APIs.
   *
   * @param call - The endpoint and the SDK call making it.
   * @param call.method - The HTTP method.
   * @param call.pathTemplate - The path template.
   * @param call.sdkMethod - The SDK call making it.
   * @param isServed - Whether the capabilities include the normalized endpoint.
   * @throws {@link UnsupportedInVersionError} if the endpoint is not served.
   */
  private checkEndpoint(
    call: {
      readonly method: string
      readonly pathTemplate: string
      readonly sdkMethod: string
    },
    isServed: (caps: CustodyCapabilities, key: string) => boolean,
  ): void {
    const key = endpointKey(call.method, call.pathTemplate)
    this.check({
      kind: 'endpoint',
      capability: `${call.method.toUpperCase()} ${call.pathTemplate}`,
      sdkMethod: call.sdkMethod,
      availability: CUSTODY_AVAILABILITY.endpoints[key],
      isSupported: (caps) => isServed(caps, key),
    })
  }

  /**
   * Pass through when unresolved; otherwise throw unless the check holds.
   *
   * @param check - The capability check.
   * @throws {@link UnsupportedInVersionError} if it is not supported.
   */
  private check(check: CapabilityCheck): void {
    const caps = this.capabilities
    if (caps === undefined || check.isSupported(caps)) {
      return
    }
    throw new UnsupportedInVersionError({
      kind: check.kind,
      capability: check.capability,
      sdkMethod: check.sdkMethod,
      appVersion: caps.appVersion,
      source: caps.source,
      availability: describeAvailability(check.availability),
      detail: check.detail?.(caps),
    })
  }
}
