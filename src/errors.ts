/* eslint-disable max-classes-per-file -- the error hierarchy lives in one file */
import type { CustodianKind, SubmissionResult } from './domain/model.js'

/**
 * Base class for every error thrown by simpleXRPL. Errors are pass-through but
 * typed: distinct underlying failure modes are not flattened into one class.
 */
export class SimpleXRPLError extends Error {
  public override readonly name: string

  /**
   * Construct a SimpleXRPLError.
   *
   * @param message - A human-readable description of the failure.
   * @param options - Optional settings.
   * @param options.cause - The underlying error, for error chaining.
   */
  public constructor(message = '', options?: { cause?: unknown }) {
    super(message, options)
    this.name = this.constructor.name
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- captureStackTrace is absent in some runtimes
    if (Error.captureStackTrace != null) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Pre-flight validation failed (intent shape, amount precision, flag rules, or
 * a custodian dry-run rejection).
 */
export class IntentValidationError extends SimpleXRPLError {}

/**
 * The resolved custodian cannot sign the requested transactor and the
 * raw-signing fallback is not available.
 */
export class SignerCapabilityError extends SimpleXRPLError {}

/**
 * A write was attempted on a client with no signer configured.
 */
export class NoSignerError extends SimpleXRPLError {}

/**
 * The requested account is not registered on the client.
 */
export class AccountNotFoundError extends SimpleXRPLError {
  public readonly account: string

  /**
   * Construct an AccountNotFoundError.
   *
   * @param account - The r-address that could not be resolved.
   */
  public constructor(account: string) {
    super(`Account not found: ${account}`)
    this.account = account
  }
}

/**
 * The same r-address was discovered under more than one custodian at init; the
 * caller must drop one or supply an explicit per-call override.
 */
export class AmbiguousAccountError extends SimpleXRPLError {
  public readonly account: string
  public readonly custodians: readonly CustodianKind[]

  /**
   * Construct an AmbiguousAccountError.
   *
   * @param account - The r-address registered under multiple custodians.
   * @param custodians - The kinds of the custodians that claim the account.
   */
  public constructor(account: string, custodians: readonly CustodianKind[]) {
    super(`Account ${account} is registered under multiple custodians`)
    this.account = account
    this.custodians = custodians
  }
}

/**
 * An account exists at a custodian, but only on XRPL network(s) other than the
 * one the client is connected to. The SDK refuses to route a transaction to the
 * wrong network (which would silently strand it), so point the client's
 * `xrpldUrl` at a node on a matching network, or register the address on this
 * network at the custodian.
 */
export class NetworkMismatchError extends SimpleXRPLError {
  public readonly account: string
  public readonly clientNetworkId: number | undefined
  public readonly availableNetworkIds: readonly number[]

  /**
   * Construct a NetworkMismatchError.
   *
   * @param account - The r-address that has no record on the client's network.
   * @param clientNetworkId - The network id the client is connected to, or
   *   `undefined` when it could not be determined.
   * @param availableNetworkIds - The network ids the account does exist on.
   */
  public constructor(
    account: string,
    clientNetworkId: number | undefined,
    availableNetworkIds: readonly number[],
  ) {
    const on = availableNetworkIds.join(', ')
    super(
      `Account ${account} is not available on the client's XRPL network ` +
        `(network id ${clientNetworkId ?? 'unknown'}); it exists on network ` +
        `id(s) [${on}]. Point the client's xrpldUrl at a node on a matching ` +
        `network, or register the address on this network at the custodian.`,
    )
    this.account = account
    this.clientNetworkId = clientNetworkId
    this.availableNetworkIds = availableNetworkIds
  }
}

/**
 * Two configured signers point at the same backend tenant — the same
 * `kind` and the same `tenantId` (§3.1). The client rejects this at init so
 * one backend is never registered twice; drop the duplicate signer.
 */
export class DuplicateSignerError extends SimpleXRPLError {
  public readonly kind: CustodianKind
  public readonly tenantId: string

  /**
   * Construct a DuplicateSignerError.
   *
   * @param kind - The custodian kind registered more than once.
   * @param tenantId - The shared backend tenant id.
   */
  public constructor(kind: CustodianKind, tenantId: string) {
    super(
      `Two ${kind} signers are configured for the same tenant '${tenantId}'; register each backend tenant once`,
    )
    this.kind = kind
    this.tenantId = tenantId
  }
}

/**
 * Authenticating with Ripple Custody failed (challenge/JWT exchange or refresh).
 */
export class CustodyAuthError extends SimpleXRPLError {}

/**
 * A Ripple Custody API call returned an error. The diagnostic `hint` and full
 * response body are preserved for the caller to surface.
 */
export class CustodyApiError extends SimpleXRPLError {
  public readonly status: number
  public readonly hint?: string
  public readonly raw: unknown

  /**
   * Construct a CustodyApiError.
   *
   * @param status - The HTTP status code.
   * @param raw - The full response body.
   * @param hint - The custodian's `processing.hint`, preserved verbatim.
   */
  public constructor(status: number, raw: unknown, hint?: string) {
    super(`Custody API error (${status})`)
    this.status = status
    this.raw = raw
    this.hint = hint
  }
}

/**
 * Authenticating with Palisade failed (API key).
 */
export class PalisadeAuthError extends SimpleXRPLError {}

/**
 * A Palisade API call returned an error. The diagnostic `hint` (the
 * `rpcStatus.message` Palisade's equivalent of Custody's `processing.hint`)
 * and full response body are preserved for the caller to surface.
 */
export class PalisadeApiError extends SimpleXRPLError {
  public readonly status: number
  public readonly hint?: string
  public readonly raw: unknown

  /**
   * Construct a PalisadeApiError.
   *
   * @param status - The HTTP status code.
   * @param raw - The full response body.
   * @param hint - Palisade's `rpcStatus.message`, preserved verbatim.
   */
  public constructor(status: number, raw: unknown, hint?: string) {
    super(`Palisade API error (${status})`)
    this.status = status
    this.raw = raw
    this.hint = hint
  }
}

/**
 * Not a failure — a "still waiting" signal raised when a custodian intent has
 * not reached a terminal state before the SDK's timeout. Resume later with the
 * carried `intentId`.
 */
export class IntentPendingError extends SimpleXRPLError {
  public readonly intentId: string
  public readonly custodian: 'ripple-custody' | 'palisade-custody'
  public readonly lastState: string

  /**
   * Construct an IntentPendingError.
   *
   * @param intentId - The custodian intent id to resume with.
   * @param custodian - The custodian kind that owns the intent.
   * @param lastState - The last observed (non-terminal) state.
   */
  public constructor(
    intentId: string,
    custodian: 'ripple-custody' | 'palisade-custody',
    lastState: string,
  ) {
    super(`Intent ${intentId} is still pending (${lastState})`)
    this.intentId = intentId
    this.custodian = custodian
    this.lastState = lastState
  }
}

/**
 * A xrpld submission was rejected. The `engineResult` and full response are
 * preserved verbatim.
 */
export class XrpldSubmitError extends SimpleXRPLError {
  public readonly engineResult: string
  public readonly raw: unknown

  /**
   * Construct a XrpldSubmitError.
   *
   * @param engineResult - The xrpld engine result code (e.g. `tecPATH_DRY`).
   * @param raw - The full xrpld response.
   */
  public constructor(engineResult: string, raw: unknown) {
    super(`xrpld submission failed: ${engineResult}`)
    this.engineResult = engineResult
    this.raw = raw
  }
}

/**
 * A multi-step operation failed partway through. simpleXRPL does not roll back; the
 * already-committed steps are carried so the caller can reconcile manually.
 */
export class MultiStepFailureError extends SimpleXRPLError {
  public readonly committed: readonly SubmissionResult[]
  public readonly failed: {
    readonly step: number
    readonly error: SimpleXRPLError
  }

  /**
   * Construct a MultiStepFailureError.
   *
   * @param committed - Sub-transactions that succeeded before the failure.
   * @param failed - The step that failed.
   * @param failed.step - The zero-based index of the failed step.
   * @param failed.error - The error that the failed step threw.
   */
  public constructor(
    committed: readonly SubmissionResult[],
    failed: { readonly step: number; readonly error: SimpleXRPLError },
  ) {
    super(`Multi-step operation failed at step ${failed.step}`)
    this.committed = committed
    this.failed = failed
  }
}
