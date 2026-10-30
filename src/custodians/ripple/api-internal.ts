import { CUSTODY_INTERNAL_ROUTES } from '../../generated/custody-internal-routes.js'
import type { operations } from '../../generated/custody-internal.js'

import { fillPath } from './api-call.js'
import type { CallArgs, ResponseBody } from './api-call.js'
import type { CustodyHttpClient } from './transport/custody-http-client.js'
import type { VersionGuard } from './versioning/version-guard.js'

/** Every internal-API operationId that has both a route and typed schema. */
export type CustodyInternalOperationId = keyof typeof CUSTODY_INTERNAL_ROUTES &
  keyof operations

/** The typed arguments for one internal operation. */
export type CustodyInternalCallArgs<Op extends CustodyInternalOperationId> =
  CallArgs<operations, Op>

/**
 * Typed access to a Custody instance's **internal** API (`/internal/v1/…`,
 * `/api/notifications/…`) — a separate API from the public one, served by the
 * same instance under the same credentials, for internal tooling (pending
 * vaults, prepared transactions, confidential-MPT callbacks, …). It isn't
 * covered by the public API's compatibility promises and can change between
 * Custody releases.
 *
 * Its operationIds overlap the public API's (e.g. `getUsers`), so it has its
 * own route map and types. Internal request bodies are never signed.
 */
export class CustodyInternalApi {
  private readonly client: CustodyHttpClient
  private readonly versionGuard: VersionGuard

  /**
   * Construct the internal API surface over the authenticated client.
   *
   * @param client - The authenticated Custody HTTP client.
   * @param versionGuard - Blocks calls the instance's version can't serve.
   */
  public constructor(client: CustodyHttpClient, versionGuard: VersionGuard) {
    this.client = client
    this.versionGuard = versionGuard
  }

  /**
   * Call an internal-API operation by its operationId. Path/query/body and the
   * response are typed from the generated internal schema.
   *
   * @param operationId - The internal operationId (autocompletes).
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link UnsupportedInVersionError} if the instance's internal API is
   *   known and doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `CustodyApiError` if the API rejects the request.
   */
  public async call<Op extends CustodyInternalOperationId>(
    operationId: Op,
    args?: CustodyInternalCallArgs<Op>,
  ): Promise<ResponseBody<operations, Op>> {
    const route = CUSTODY_INTERNAL_ROUTES[operationId]
    this.versionGuard.assertInternalEndpoint(
      route.method,
      route.path,
      `api.internal.call('${operationId}')`,
    )
    const path = fillPath(route.path, args?.path)
    return this.client.invoke<ResponseBody<operations, Op>>(
      route.method,
      path,
      { query: args?.query, body: args?.body },
    )
  }
}
