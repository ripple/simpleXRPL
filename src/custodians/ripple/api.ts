import { SimpleXRPLError } from '../../errors.js'
import { CUSTODY_ROUTES } from '../../generated/custody-routes.js'
import type { components, operations } from '../../generated/custody.js'

import type { IntentSigner } from './auth/intent-signer.js'
import {
  buildProposeEnvelope,
  type ProposeEnvelopeContext,
  type ProposeEnvelopeOverrides,
} from './mapping/propose-envelope.js'
import type { CustodyHttpClient } from './transport/custody-http-client.js'

/** Every Custody operationId that has both a route and typed schema. */
export type CustodyOperationId = keyof typeof CUSTODY_ROUTES & keyof operations

/** A governed-intent payload to propose (any `v0_*` variant Custody accepts). */
export type CustodyProposePayload =
  components['schemas']['Core_ProposeUserIntentPayload']
/** Per-call envelope overrides for {@link CustodyApi.propose}. */
export type CustodyProposeOptions = ProposeEnvelopeOverrides

/** The path parameters an operation takes (or `never` if it has none). */
type PathParams<Op extends keyof operations> =
  operations[Op]['parameters']['path']
/** The query parameters an operation takes (or `never`/`undefined`). */
type QueryParams<Op extends keyof operations> =
  operations[Op]['parameters']['query']
/** The JSON request body an operation takes (or `never` if it has none). */
type RequestBody<Op extends keyof operations> = operations[Op] extends {
  requestBody: { content: { 'application/json': infer Body } }
}
  ? Body
  : never
/* eslint-disable @typescript-eslint/no-magic-numbers -- 200 indexes the OpenAPI success-response type */
/** The JSON response body an operation returns (or `unknown` if untyped). */
type ResponseBody<Op extends keyof operations> = operations[Op] extends {
  responses: { 200: { content: { 'application/json': infer Res } } }
}
  ? Res
  : unknown
/* eslint-enable @typescript-eslint/no-magic-numbers */

/** The typed arguments for one operation: path params, query, and/or body. */
export interface CustodyCallArgs<Op extends CustodyOperationId> {
  readonly path?: PathParams<Op>
  readonly query?: QueryParams<Op>
  readonly body?: RequestBody<Op>
}

/**
 * Fill `{name}` placeholders in a route template from the supplied path params.
 *
 * @param template - The route path template (e.g. `/v1/domains/{domainId}`).
 * @param params - The path parameters, keyed by placeholder name.
 * @returns The interpolated path.
 * @throws {@link SimpleXRPLError} if a placeholder has no matching parameter.
 */
function fillPath(template: string, params?: Record<string, unknown>): string {
  return template.replace(/\{(?<key>\w+)\}/gu, (_match, key: string) => {
    const value = params?.[key]
    if (value === undefined) {
      throw new SimpleXRPLError(
        `Missing path parameter '${key}' for Custody route ${template}`,
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- path params are scalars (ids / r-addresses)
    return encodeURIComponent(String(value))
  })
}

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

  /**
   * Construct the API surface over the authenticated client.
   *
   * @param client - The authenticated Custody HTTP client.
   * @param propose - The signer and domain/author context {@link propose} needs
   *   to build and sign intent envelopes.
   * @param propose.intentSigner - Signs the canonicalized intent request.
   * @param propose.domainId - The Custody domain intents are proposed under.
   * @param propose.authorUserId - The intent-author's Custody user id.
   */
  public constructor(
    client: CustodyHttpClient,
    propose: ProposeEnvelopeContext & { intentSigner: IntentSigner },
  ) {
    this.client = client
    this.intentSigner = propose.intentSigner
    this.proposeContext = {
      domainId: propose.domainId,
      authorUserId: propose.authorUserId,
    }
  }

  /**
   * Call any Custody operation by its operationId. Path/query/body and the
   * response are typed from the generated schema.
   *
   * @param operationId - The Custody operationId (autocompletes to all routes).
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `CustodyApiError` if the API rejects the request (e.g. 403/404).
   */
  public async call<Op extends CustodyOperationId>(
    operationId: Op,
    args?: CustodyCallArgs<Op>,
  ): Promise<ResponseBody<Op>> {
    const route = CUSTODY_ROUTES[operationId]
    const path = fillPath(route.path, args?.path)
    return this.client.invoke<ResponseBody<Op>>(route.method, path, {
      query: args?.query,
      body: args?.body,
    })
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
   * @throws {@link CustodyAuthError} if the request cannot be canonicalized.
   * @throws A `CustodyApiError` if the API rejects the intent.
   */
  public async propose(
    payload: CustodyProposePayload,
    options?: CustodyProposeOptions,
  ): Promise<components['schemas']['Core_IntentResponse']> {
    const body = buildProposeEnvelope(this.intentSigner, {
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
}
