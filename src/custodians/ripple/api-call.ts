import { SimpleXRPLError } from '../../errors.js'

/*
 * Request/response typing for a by-operationId call, generic over a generated
 * `operations` map — shared by the public API (`CustodyApi.call`) and the
 * internal API (`CustodyInternalApi.call`), whose maps are generated
 * separately because their operationIds overlap.
 */

/** The path parameters an operation takes (or `never` if it has none). */
export type PathParams<Ops, Op extends keyof Ops> = Ops[Op] extends {
  parameters: { path?: infer Path extends object }
}
  ? Path
  : never

/** The query parameters an operation takes (or `never`/`undefined`). */
export type QueryParams<Ops, Op extends keyof Ops> = Ops[Op] extends {
  parameters: { query?: infer Query extends Record<string, unknown> }
}
  ? Query
  : never

/** The JSON request body an operation takes (or `never` if it has none). */
export type RequestBody<Ops, Op extends keyof Ops> = Ops[Op] extends {
  requestBody: { content: { 'application/json': infer Body } }
}
  ? Body
  : never

/* eslint-disable @typescript-eslint/no-magic-numbers -- 200 indexes the OpenAPI success-response type */
/** The JSON response body an operation returns (or `unknown` if untyped). */
export type ResponseBody<Ops, Op extends keyof Ops> = Ops[Op] extends {
  responses: { 200: { content: { 'application/json': infer Res } } }
}
  ? Res
  : unknown
/* eslint-enable @typescript-eslint/no-magic-numbers */

/** The typed arguments for one operation: path params, query, and/or body. */
export interface CallArgs<Ops, Op extends keyof Ops> {
  readonly path?: PathParams<Ops, Op>
  readonly query?: QueryParams<Ops, Op>
  readonly body?: RequestBody<Ops, Op>
}

/**
 * Fill `{name}` placeholders in a route template from the supplied path params.
 *
 * @param template - The route path template (e.g. `/v1/domains/{domainId}`).
 * @param params - The path parameters, keyed by placeholder name.
 * @returns The interpolated path.
 * @throws {@link SimpleXRPLError} if a placeholder has no matching parameter.
 */
export function fillPath(template: string, params?: object): string {
  const values: Readonly<Record<string, unknown>> = { ...params }
  return template.replace(/\{(?<key>\w+)\}/gu, (_match, key: string) => {
    const value = values[key]
    // Treat null like undefined: without this it would stringify to the literal
    // "null" and silently produce a malformed path.
    if (value === undefined || value === null) {
      throw new SimpleXRPLError(
        `Missing path parameter '${key}' for Custody route ${template}`,
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- path params are scalars (ids / r-addresses)
    return encodeURIComponent(String(value))
  })
}
