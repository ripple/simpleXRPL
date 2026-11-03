import { SimpleXRPLError } from '../../errors.js'
import { CUSTODY_ROUTES } from '../../generated/custody-routes.js'
import type { components, operations, paths } from '../../generated/custody.js'

import { fillPath } from './api-call.js'
import type {
  CallArgs,
  OperationArgs,
  OperationResponse,
  ResponseBody,
} from './api-call.js'
import type { IntentSigner } from './auth/intent-signer.js'
import { buildDecisionEnvelope } from './mapping/decision-envelope.js'
import type { IntentDecision } from './mapping/decision-envelope.js'
import {
  buildProposeEnvelope,
  type ProposeEnvelopeContext,
  type ProposeEnvelopeOverrides,
} from './mapping/propose-envelope.js'
import type { CustodyHttpClient } from './transport/custody-http-client.js'
import { VersionGuard } from './versioning/version-guard.js'

/** Every Custody operationId that has both a route and typed schema. */
export type CustodyOperationId = keyof typeof CUSTODY_ROUTES & keyof operations

/** A governed-intent payload to propose (any `v0_*` variant Custody accepts). */
export type CustodyProposePayload =
  components['schemas']['Core_ProposeUserIntentPayload']
/** Per-call envelope overrides for {@link CustodyApi.propose}. */
export type CustodyProposeOptions = ProposeEnvelopeOverrides

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

/** Custody's limit on an approval or rejection reason. */
const MAX_REASON_LENGTH = 5000
/**
 * Low-level, typed access to the full Ripple Custody v1 API — a **secondary**
 * surface beside the first-class verticals, for endpoints simpleXRPL doesn't
 * model (domains, policies, backups, reading intents/transfers, and so on).
 *
 * `call(operationId, args)` resolves the route from the generated route map and
 * infers the path/query/body and response types from the generated `operations`
 * schema, so every endpoint is typed without a hand-written method per resource.
 *
 * Custody uses a single credential for every endpoint, so all calls go through
 * the one authenticated client — there is no per-scope routing.
 *
 * Two surfaces: {@link call} is a plain HTTP passthrough for reads and
 * plain-body writes; {@link propose} is the signed-intent passthrough for
 * governed writes — it builds and signs the `Core_Propose` envelope with the
 * intent-author key, so callers reach any governed intent (e.g. releasing
 * quarantined transfers) without a dedicated vertical.
 */
export class CustodyApi {
  private readonly client: CustodyHttpClient
  private readonly intentSigner: IntentSigner
  private readonly proposeContext: ProposeEnvelopeContext
  private readonly versionGuard: VersionGuard

  /**
   * Construct the API surface over the authenticated client.
   *
   * @param client - The authenticated Custody HTTP client.
   * @param propose - The signer and domain/author context {@link propose} needs
   *   to build and sign intent envelopes.
   * @param propose.intentSigner - Signs the canonicalized intent request.
   * @param propose.domainId - The Custody domain intents are proposed under.
   * @param propose.authorUserId - The intent-author's Custody user id.
   * @param propose.versionGuard - Blocks calls the instance's version can't
   *   serve; omitted, nothing is blocked.
   */
  public constructor(
    client: CustodyHttpClient,
    propose: ProposeEnvelopeContext & {
      intentSigner: IntentSigner
      versionGuard?: VersionGuard
    },
  ) {
    this.client = client
    this.intentSigner = propose.intentSigner
    this.proposeContext = {
      domainId: propose.domainId,
      authorUserId: propose.authorUserId,
    }
    this.versionGuard = propose.versionGuard ?? new VersionGuard(undefined)
  }

  /**
   * Call any Custody operation by its operationId. Path/query/body and the
   * response are typed from the generated schema.
   *
   * @param operationId - The Custody operationId (autocompletes to all routes).
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `CustodyApiError` if the API rejects the request (e.g. 403/404).
   */
  public async call<Op extends CustodyOperationId>(
    operationId: Op,
    args?: CustodyCallArgs<Op>,
  ): Promise<ResponseBody<operations, Op>> {
    const route = CUSTODY_ROUTES[operationId]
    this.versionGuard.assertEndpoint(
      route.method,
      route.path,
      `api.call('${operationId}')`,
    )
    const path = fillPath(route.path, args?.path)
    return this.client.invoke<ResponseBody<operations, Op>>(
      route.method,
      path,
      {
        query: args?.query,
        body: args?.body,
      },
    )
  }

  /**
   * Call any Custody endpoint by its HTTP method and path template — including
   * the ones with no operationId, which {@link call} can't name (e.g. user
   * invitations). Path/query/body and the response are typed from the
   * generated schema, and only methods a path actually serves are accepted.
   *
   * @param method - The HTTP method.
   * @param path - The path template, e.g. `/v1/domains/{domainId}/users/invitations`.
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `CustodyApiError` if the API rejects the request.
   */
  public async request<
    Method extends CustodyHttpMethod,
    Path extends CustodyRequestPath<Method>,
  >(
    method: Method,
    path: Path,
    args?: CustodyRequestArgs<Method, Path>,
  ): Promise<CustodyRequestResponse<Method, Path>> {
    this.versionGuard.assertEndpoint(
      method,
      path,
      `api.request('${method}', '${path}')`,
    )
    return this.client.invoke<CustodyRequestResponse<Method, Path>>(
      method,
      fillPath(path, args?.path),
      { query: args?.query, body: args?.body },
    )
  }

  /**
   * Approve an existing intent as the API user — e.g. as an automated approver
   * under the intent's policy. Fetches the intent, then signs and posts the
   * approval with the intent-author key.
   *
   * @param intentId - The intent to approve.
   * @param options - Options.
   * @param options.reason - Why it is approved (up to 5000 characters).
   * @returns The Custody `{ requestId }` acknowledging the approval.
   * @throws {@link SimpleXRPLError} if the reason is too long.
   * @throws A `CustodyApiError` if the intent doesn't exist, or Custody
   *   rejects the approval (e.g. the user isn't an approver for it).
   */
  public async approve(
    intentId: string,
    options: { readonly reason?: string } = {},
  ): Promise<components['schemas']['Core_IntentResponse']> {
    return this.decide(intentId, 'Approve', options.reason)
  }

  /**
   * Reject an existing intent as the API user. Fetches the intent, then signs
   * and posts the rejection with the intent-author key.
   *
   * @param intentId - The intent to reject.
   * @param options - Options.
   * @param options.reason - Why it is rejected (1–5000 characters; required).
   * @returns The Custody `{ requestId }` acknowledging the rejection.
   * @throws {@link SimpleXRPLError} if the reason is empty or too long.
   * @throws A `CustodyApiError` if the intent doesn't exist, or Custody
   *   rejects the rejection (e.g. the user can't decide on it).
   */
  public async reject(
    intentId: string,
    options: { readonly reason: string },
  ): Promise<components['schemas']['Core_IntentResponse']> {
    return this.decide(intentId, 'Reject', options.reason)
  }

  /**
   * Propose a governed intent: wrap `payload` in a `Core_Propose` envelope,
   * sign the canonicalized request with the intent-author key, and POST it to
   * `/v1/intents`. This is the signed counterpart to {@link call} — for
   * governed writes simpleXRPL has no vertical for (e.g. releasing quarantined
   * transfers). The intent still runs the account's approval policy; this only
   * proposes it.
   *
   * @param payload - The governed-intent payload (any `v0_*` variant).
   * @param options - Optional envelope overrides (idempotency id, expiry,
   *   custom properties, and so on).
   * @returns The Custody `{ requestId }` acknowledging the accepted intent.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't accept the intent type, or the XRPL operation a
   *   transaction order carries.
   * @throws {@link CustodyAuthError} if the request cannot be canonicalized.
   * @throws A `CustodyApiError` if the API rejects the intent.
   */
  public async propose(
    payload: CustodyProposePayload,
    options?: CustodyProposeOptions,
  ): Promise<components['schemas']['Core_IntentResponse']> {
    this.versionGuard.assertIntentType(payload.type, 'api.propose')
    if (
      payload.type === 'v0_CreateTransactionOrder' &&
      payload.parameters.type === 'XRPL' &&
      payload.parameters.operation !== undefined
    ) {
      this.versionGuard.assertXrplOperation(
        payload.parameters.operation.type,
        'api.propose',
      )
    }
    const body = await buildProposeEnvelope(this.intentSigner, {
      ...this.proposeContext,
      payload,
      overrides: options,
    })
    const route = CUSTODY_ROUTES.createIntent
    return this.client.invoke<components['schemas']['Core_IntentResponse']>(
      route.method,
      route.path,
      { body },
    )
  }

  /**
   * Shared by {@link approve} and {@link reject}: validate the reason, fetch
   * the intent for its proposal signature, then sign and post the decision.
   *
   * @param intentId - The intent to decide on.
   * @param decision - Approve or reject.
   * @param reason - The reason, if any.
   * @returns The Custody `{ requestId }` acknowledging the decision.
   * @throws {@link SimpleXRPLError} if the reason is invalid.
   */
  private async decide(
    intentId: string,
    decision: IntentDecision,
    reason: string | undefined,
  ): Promise<components['schemas']['Core_IntentResponse']> {
    const sdkMethod = decision === 'Approve' ? 'api.approve' : 'api.reject'
    if (decision === 'Reject' && (reason === undefined || reason === '')) {
      throw new SimpleXRPLError(`${sdkMethod} needs a reason`)
    }
    if (reason !== undefined && reason.length > MAX_REASON_LENGTH) {
      throw new SimpleXRPLError(
        `${sdkMethod} reason is ${reason.length} characters; Custody allows up to ${MAX_REASON_LENGTH}`,
      )
    }
    const route =
      decision === 'Approve'
        ? CUSTODY_ROUTES.approveIntent
        : CUSTODY_ROUTES.rejectIntent
    this.versionGuard.assertEndpoint(route.method, route.path, sdkMethod)
    const intent = await this.call('getIntent', {
      path: { domainId: this.proposeContext.domainId, intentId },
    })
    const body = await buildDecisionEnvelope(this.intentSigner, {
      ...this.proposeContext,
      intent,
      decision,
      reason,
    })
    return this.client.invoke<components['schemas']['Core_IntentResponse']>(
      route.method,
      route.path,
      { body },
    )
  }
}
