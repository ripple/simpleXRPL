import { SimpleXRPLError } from '../../errors.js'

/*
 * Request/response typing for a Custody call, derived from a generated
 * operation object — one from the `operations` map (calls by operationId,
 * `CustodyApi.call`) or from the `paths` map (calls by path,
 * `CustodyApi.request`, which also reaches operations with no operationId).
 */

/** The path parameters an operation takes (or `never` if it has none). */
export type OperationPathParams<Op> = Op extends {
  parameters: { path?: infer Path extends object }
}
  ? Path
  : never

/** The query parameters an operation takes (or `never`/`undefined`). */
export type OperationQuery<Op> = Op extends {
  parameters: { query?: infer Query extends Record<string, unknown> }
}
  ? Query
  : never

/**
 * The JSON body inside a request-body declaration, or `never` when there is
 * none (`requestBody?: never`) or it isn't JSON (e.g. a multipart upload, which
 * the transport can't send).
 */
type JsonBodyOf<Declared> = [Declared] extends [never]
  ? never
  : Declared extends { content: { 'application/json': infer Body } }
    ? Body
    : never

/** The JSON request body an operation takes, required or optional. */
export type OperationBody<Op> = Op extends { requestBody?: infer Declared }
  ? JsonBodyOf<NonNullable<Declared>>
  : never

/* eslint-disable @typescript-eslint/no-magic-numbers -- 200 indexes the OpenAPI success-response type */
/** The JSON response body an operation returns (or `unknown` if untyped). */
export type OperationResponse<Op> = Op extends {
  responses: { 200: { content: { 'application/json': infer Res } } }
}
  ? Res
  : unknown
/* eslint-enable @typescript-eslint/no-magic-numbers */

/** The typed arguments for one operation: path params, query, and/or body. */
export interface OperationArgs<Op> {
  readonly path?: OperationPathParams<Op>
  readonly query?: OperationQuery<Op>
  readonly body?: OperationBody<Op>
}

/** {@link OperationResponse} for an operation in an `operations` map. */
export type ResponseBody<Ops, Op extends keyof Ops> = OperationResponse<Ops[Op]>

/** {@link OperationArgs} for an operation in an `operations` map. */
export type CallArgs<Ops, Op extends keyof Ops> = OperationArgs<Ops[Op]>

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
