import { SimpleXRPLError } from '../../errors.js'
import { PALISADE_ROUTES } from '../../generated/palisade-routes.js'
import type { PalisadeScope } from '../../generated/palisade-routes.js'
import type { operations } from '../../generated/palisade.js'

import type { PalisadeHttpClient } from './transport/palisade-http-client.js'

/** A per-scope client override for tag-based auth routing (option b). */
export type PalisadeScopedClients = Partial<
  Record<PalisadeScope, PalisadeHttpClient>
>

/** Every Palisade operationId that has both a route and typed schema. */
export type PalisadeOperationId = keyof typeof PALISADE_ROUTES &
  keyof operations

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
export interface PalisadeCallArgs<Op extends PalisadeOperationId> {
  readonly path?: PathParams<Op>
  readonly query?: QueryParams<Op>
  readonly body?: RequestBody<Op>
}

/**
 * Fill `{name}` placeholders in a route template from the supplied path params.
 *
 * @param template - The route path template (e.g. `/v2/vaults/{vaultId}`).
 * @param params - The path parameters, keyed by placeholder name.
 * @returns The interpolated path.
 * @throws {@link SimpleXRPLError} if a placeholder has no matching parameter.
 */
function fillPath(template: string, params?: Record<string, unknown>): string {
  return template.replace(/\{(?<key>\w+)\}/gu, (_match, key: string) => {
    const value = params?.[key]
    if (value === undefined) {
      throw new SimpleXRPLError(
        `Missing path parameter '${key}' for Palisade route ${template}`,
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- path params are scalars (ids / r-addresses)
    return encodeURIComponent(String(value))
  })
}

/**
 * Low-level, typed access to the full Palisade v2 API — a **secondary** surface
 * beside the first-class verticals, for operations simpleXRPL doesn't model
 * (vaults, counterparties, policies, webhooks, balances, and so on).
 *
 * `call(operationId, args)` resolves the route from the generated route map and
 * infers the path/query/body and response types from the generated `operations`
 * schema, so every endpoint is typed without a hand-written method per resource.
 *
 * Auth routing has two layers. Tag-based routing (option b) comes first: if a
 * client is registered for the operation's permission scope (its OpenAPI tag,
 * e.g. `Policies` or `Webhooks`), that client is used — since Palisade scopes
 * one permission set per credential, a full deployment registers one per scope
 * it uses. Otherwise it falls back to method-based routing (option a): reads
 * (`GET`) on the wallet-read credential, mutations on the transactions one. An
 * operation whose scope no registered credential carries gets a 403 from
 * Palisade.
 */
export class PalisadeApi {
  private readonly readClient: PalisadeHttpClient
  private readonly writeClient: PalisadeHttpClient
  private readonly byScope: PalisadeScopedClients

  /**
   * Construct the API surface over the authenticated clients.
   *
   * @param readClient - Authenticated with the wallet-read credential (GETs).
   * @param writeClient - Authenticated with the transactions credential (mutations).
   * @param byScope - Optional per-scope clients for tag-based routing (option b).
   */
  public constructor(
    readClient: PalisadeHttpClient,
    writeClient: PalisadeHttpClient,
    byScope: PalisadeScopedClients = {},
  ) {
    this.readClient = readClient
    this.writeClient = writeClient
    this.byScope = byScope
  }

  /**
   * Call any Palisade operation by its operationId. Path/query/body and the
   * response are typed from the generated schema.
   *
   * @param operationId - The Palisade operationId (autocompletes to all routes).
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `PalisadeApiError` if the API rejects the request (e.g. 403/404).
   */
  public async call<Op extends PalisadeOperationId>(
    operationId: Op,
    args?: PalisadeCallArgs<Op>,
  ): Promise<ResponseBody<Op>> {
    const route = PALISADE_ROUTES[operationId]
    const path = fillPath(route.path, args?.path)
    // Tag-based routing (b) first, then the method-based (a) fallback.
    const client =
      this.byScope[route.scope] ??
      (route.method === 'GET' ? this.readClient : this.writeClient)
    return client.invoke<ResponseBody<Op>>(route.method, path, {
      query: args?.query,
      body: args?.body,
    })
  }
}
