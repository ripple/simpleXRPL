import type { CustodyApiError } from '../../../errors.js'

/*
 * Hints for failures caused by known Ripple Custody server bugs. Each one looks
 * like nothing at all from the caller's side — a bare 500, or a signature that
 * "doesn't verify" although the SDK signed exactly what it sent — so the hint
 * names the trigger and the workaround instead of leaving it to be bisected.
 * Nothing is rewritten automatically: each workaround changes what is asked
 * for, which is the caller's call to make.
 */

const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500

/** The request a failed response answered, as far as the hints need it. */
export interface FailedRequest {
  /** The absolute request URL, query included. */
  readonly url: string
  /** The serialized JSON body, if one was sent. */
  readonly body?: string
}

/** The query parameter some Custody versions answer with a 500. */
const BROKEN_QUERY_PARAM = 'quarantineStatus'

/**
 * Array length at which Custody stops keeping a set-typed field in the order
 * it was sent (its small sets keep insertion order; five or more elements
 * become a hash set).
 */
const SET_REORDER_THRESHOLD = 5

/**
 * A `500` on a request that filtered on `quarantineStatus`, which some Custody
 * versions fail on (seen on the transfers endpoint).
 *
 * The deprecated `quarantined` boolean is not substituted automatically: it
 * has two values for three statuses, so only `Quarantined` has an exact
 * equivalent, and a silent swap would turn a loud 500 into wrong rows for a
 * caller asking about `Skipped`.
 *
 * @param request - The failed request.
 * @returns The hint, or `undefined` if the request didn't use the filter.
 */
function quarantineStatusHint(request: FailedRequest): string | undefined {
  if (!new URL(request.url).searchParams.has(BROKEN_QUERY_PARAM)) {
    return undefined
  }
  return (
    `The request filtered on \`${BROKEN_QUERY_PARAM}\`, which some Ripple ` +
    'Custody versions answer with a 500 on the transfers endpoint. Filtering ' +
    'on the deprecated `quarantined` boolean instead returns the same rows ' +
    'for `Quarantined` (`quarantined: true`); it cannot express `Skipped`, ' +
    'which shares `quarantined: false` with `Released`.'
  )
}

/**
 * Collect the dotted path of every array holding at least
 * {@link SET_REORDER_THRESHOLD} elements.
 *
 * @param value - The value to walk.
 * @param path - Its path so far.
 * @param found - The accumulating paths.
 */
function collectLargeArrays(
  value: unknown,
  path: string,
  found: string[],
): void {
  if (Array.isArray(value)) {
    if (value.length >= SET_REORDER_THRESHOLD) {
      found.push(path)
    }
    value.forEach((item: unknown, index) => {
      collectLargeArrays(item, `${path}[${index}]`, found)
    })
    return
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      collectLargeArrays(child, `${path}.${key}`, found)
    }
  }
}

/**
 * A `401 InvalidSignatureError` on a signed body holding an array of five or
 * more elements. Custody reads some array fields (e.g. an operation's `flags`)
 * into an unordered set and re-serializes it to verify the signature; from
 * five elements on, that re-emits one fixed order, so Custody verifies
 * different bytes than were signed.
 *
 * @param request - The failed request.
 * @returns The hint, or `undefined` if no array is large enough to be why.
 */
function signatureHint(request: FailedRequest): string | undefined {
  let signed: unknown
  try {
    const parsed: unknown = JSON.parse(request.body ?? '')
    signed =
      typeof parsed === 'object' && parsed !== null && 'signature' in parsed
        ? Reflect.get(parsed, 'request')
        : undefined
  } catch {
    return undefined
  }
  const found: string[] = []
  collectLargeArrays(signed, 'request', found)
  if (found.length === 0) {
    return undefined
  }
  const paths = found.map((path) => `\`${path}\``).join(', ')
  return (
    `The signed body has array field(s) with ${SET_REORDER_THRESHOLD}+ ` +
    `elements (${paths}). Some Ripple Custody versions re-serialize such ` +
    'fields in their own order before verifying the signature, so they check ' +
    'different bytes than were signed. Sending the elements in the order ' +
    'Custody re-emits them works around it.'
  )
}

/**
 * The hint for a failure that matches a known Custody server bug.
 *
 * @param request - The failed request.
 * @param error - The error Custody returned for it.
 * @returns The hint, or `undefined` if no known bug matches.
 */
export function knownIssueHint(
  request: FailedRequest,
  error: CustodyApiError,
): string | undefined {
  if (error.status === HTTP_INTERNAL_SERVER_ERROR) {
    return quarantineStatusHint(request)
  }
  if (
    error.status === HTTP_UNAUTHORIZED &&
    error.reason === 'InvalidSignatureError'
  ) {
    return signatureHint(request)
  }
  return undefined
}
