/*
 * Reading Custody's error bodies, for `CustodyApiError`.
 */

/** The longest stretch of a non-JSON error body quoted in a message. */
const MAX_QUOTED_BODY = 200

/** What a Custody error body says, as far as it can be read. */
export interface CustodyErrorBody {
  readonly reason?: string
  readonly detail?: string
  readonly hint?: string
}

/**
 * Read a string field off an unknown value.
 *
 * @param value - The candidate object.
 * @param key - The field name.
 * @returns The field, if it is a non-empty string.
 */
function stringField(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return undefined
  }
  const field: unknown = Reflect.get(value, key)
  return typeof field === 'string' && field !== '' ? field : undefined
}

/**
 * Join Custody's `message` with any `additionalDetails` entries it carries.
 *
 * @param body - The parsed error body.
 * @returns The combined detail, if there is any.
 */
function describeDetail(body: object): string | undefined {
  const message = stringField(body, 'message')
  const extra: unknown = Reflect.get(body, 'additionalDetails')
  const details = Array.isArray(extra)
    ? extra
        .map((item: unknown) =>
          [stringField(item, 'reason'), stringField(item, 'message')]
            .filter((part) => part !== undefined)
            .join(': '),
        )
        .filter((part) => part !== '')
    : []
  if (details.length === 0) {
    return message
  }
  const listed = details.join('; ')
  return message === undefined ? listed : `${message} (${listed})`
}

/**
 * Read the reason, detail, and hint out of a Custody error body — the JSON
 * `{ reason, message }` Custody usually sends, or the start of a text body
 * (e.g. a gateway's HTML error page).
 *
 * @param raw - The response body, as text or already parsed.
 * @returns What the body says.
 */
export function readErrorBody(raw: unknown): CustodyErrorBody {
  let body = raw
  if (typeof raw === 'string') {
    try {
      body = JSON.parse(raw)
    } catch {
      const text = raw.trim()
      return text === ''
        ? {}
        : {
            detail:
              text.length > MAX_QUOTED_BODY
                ? `${text.slice(0, MAX_QUOTED_BODY)}…`
                : text,
          }
    }
  }
  if (typeof body !== 'object' || body === null) {
    return {}
  }
  const processing: unknown = Reflect.get(body, 'processing')
  return {
    reason: stringField(body, 'reason') ?? stringField(body, 'code'),
    detail: describeDetail(body),
    hint: stringField(processing, 'hint'),
  }
}
