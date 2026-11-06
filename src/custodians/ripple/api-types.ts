import type { CUSTODY_ROUTES } from '../../generated/custody-routes.js'
import type { components, operations, paths } from '../../generated/custody.js'

import type { CallArgs, OperationArgs, OperationResponse } from './api-call.js'
import type { ProposeEnvelopeOverrides } from './mapping/propose-envelope.js'

/*
 * The public types of `CustodyApi`'s call, request, and propose surfaces.
 */

/** Every Custody operationId that has both a route and typed schema. */
export type CustodyOperationId = keyof typeof CUSTODY_ROUTES & keyof operations

/** A governed-intent payload to propose (any `v0_*` variant Custody accepts). */
export type CustodyProposePayload =
  components['schemas']['Core_ProposeUserIntentPayload']
/** Per-call envelope overrides for {@link CustodyApi.propose}. */
export type CustodyProposeOptions = ProposeEnvelopeOverrides

/**
 * What {@link CustodyApi.propose} returns: Custody's acknowledgement plus the
 * `intentId` the proposal was signed under — the handle for reading, awaiting,
 * approving, or rejecting the intent.
 */
export type CustodyProposeResponse =
  components['schemas']['Core_IntentResponse'] & {
    /** The proposed intent's id (the signed envelope's `request.id`). */
    readonly intentId: string
  }

/** The typed arguments for one operation: path params, query, and/or body. */
export type CustodyCallArgs<Op extends CustodyOperationId> = CallArgs<
  operations,
  Op
>

/** The HTTP methods {@link CustodyApi.request} sends. */
export type CustodyHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** The operation `path` serves for `method` (`never` if it serves none). */
type PathOperation<
  Path extends keyof paths,
  Method extends CustodyHttpMethod,
> = NonNullable<paths[Path][Lowercase<Method>]>

/** Every Custody path template that serves `Method`. */
export type CustodyRequestPath<Method extends CustodyHttpMethod> = {
  [Path in keyof paths]: [PathOperation<Path, Method>] extends [never]
    ? never
    : Path
}[keyof paths]

/** The typed arguments for one `request`: path params, query, and/or body. */
export type CustodyRequestArgs<
  Method extends CustodyHttpMethod,
  Path extends CustodyRequestPath<Method>,
> = OperationArgs<PathOperation<Path, Method>>

/** The typed response of one `request`. */
export type CustodyRequestResponse<
  Method extends CustodyHttpMethod,
  Path extends CustodyRequestPath<Method>,
> = OperationResponse<PathOperation<Path, Method>>
