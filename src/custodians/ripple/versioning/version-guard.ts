import { UnsupportedInVersionError } from '../../../errors.js'

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
  /** Whether the resolved capabilities include it. */
  readonly isSupported: (caps: CustodyCapabilities) => boolean
}

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
   * Assert the version serves an endpoint.
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
    const key = endpointKey(method, pathTemplate)
    this.check({
      kind: 'endpoint',
      capability: `${method.toUpperCase()} ${pathTemplate}`,
      sdkMethod,
      isSupported: (caps) => caps.endpoints.has(key),
    })
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
    })
  }
}
