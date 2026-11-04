import type { components } from '../../../generated/custody.js'
import { uuidV7 } from '../../../ids/index.js'
import type { IntentSigner } from '../auth/intent-signer.js'

type ProposeIntentBody = components['schemas']['Core_UserSigned']
type ProposeUserIntentPayload =
  components['schemas']['Core_ProposeUserIntentPayload']
type UserReference = components['schemas']['Core_UserReference']
type StringsMap = components['schemas']['Core_StringsMap']

/** The envelope fields shared by a proposal and a dry-run request. */
export interface EnvelopeRequest {
  readonly author: UserReference
  readonly expiryAt: string
  readonly targetDomainId: string
  readonly id: string
  readonly payload: ProposeUserIntentPayload
  readonly customProperties: StringsMap
  readonly description?: string
}

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
/**
 * Default intent lifetime: ~1 day. Overridable per call via
 * {@link ProposeEnvelopeOverrides.expiryAt}.
 */
export const DEFAULT_INTENT_EXPIRY_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

/** The context every proposed intent shares: which domain and author it's from. */
export interface ProposeEnvelopeContext {
  /** The Custody domain the intent targets and the author belongs to. */
  readonly domainId: string
  /** The intent-author's Custody user id (resolved once via `GET /v1/me`). */
  readonly authorUserId: string
}

/** The payload to propose plus the context and overrides its envelope needs. */
export interface ProposeEnvelopeInput extends ProposeEnvelopeContext {
  /** The governed-intent payload (any `v0_*` variant). */
  readonly payload: ProposeUserIntentPayload
  /** Optional per-call envelope overrides. */
  readonly overrides?: ProposeEnvelopeOverrides
}

/** Per-call overrides for the envelope Custody wraps around the payload. */
export interface ProposeEnvelopeOverrides {
  /**
   * The intent's id — the caller's idempotency key. A retry with the same id
   * resolves to the same intent. When omitted, defaults to the payload's own
   * `id` if it carries one (keeping envelope and payload ids in sync), else a
   * fresh {@link uuidV7}.
   */
  readonly id?: string
  /** ISO-8601 expiry; defaults to ~1 day out ({@link DEFAULT_INTENT_EXPIRY_MS}). */
  readonly expiryAt?: string
  /** The domain the intent targets; defaults to the context domain. */
  readonly targetDomainId?: string
  /** The intent author; defaults to `{ id: authorUserId, domainId }`. */
  readonly author?: UserReference
  /** A human-readable description carried on the intent. */
  readonly description?: string
  /** Envelope-level custom properties; defaults to `{}`. */
  readonly customProperties?: StringsMap
}

/**
 * The payload's own `id`, when it carries one. Some intent payloads embed an id
 * Custody expects to match the envelope id; most carry none.
 *
 * @param payload - The intent payload.
 * @returns The payload's `id`, or `undefined` when it has none.
 */
function payloadId(payload: ProposeUserIntentPayload): string | undefined {
  return 'id' in payload && typeof payload.id === 'string'
    ? payload.id
    : undefined
}

/**
 * The unsigned envelope around an intent payload: author, expiry, target
 * domain, id, and custom properties, filled from the context and any
 * overrides. The shared core of a proposal ({@link buildProposeEnvelope} signs
 * it) and a dry-run (posted as-is).
 *
 * @param input - The payload, the domain/author context, and any overrides.
 * @returns The envelope fields, without the request `type`.
 */
export function buildEnvelopeRequest(
  input: ProposeEnvelopeInput,
): EnvelopeRequest {
  const overrides = input.overrides ?? {}
  return {
    author: overrides.author ?? {
      id: input.authorUserId,
      domainId: input.domainId,
    },
    expiryAt:
      overrides.expiryAt ??
      new Date(Date.now() + DEFAULT_INTENT_EXPIRY_MS).toISOString(),
    targetDomainId: overrides.targetDomainId ?? input.domainId,
    // Some payloads carry their own id (e.g. v0_CreateTransactionOrder), which
    // Custody expects to match the envelope id. Default to it so the two never
    // diverge; an explicit override still wins, and idless payloads get a fresh
    // id.
    id: overrides.id ?? payloadId(input.payload) ?? uuidV7(),
    payload: input.payload,
    customProperties: overrides.customProperties ?? {},
    // Omit `description` entirely when absent rather than carry an undefined key.
    ...(overrides.description === undefined
      ? {}
      : { description: overrides.description }),
  }
}

/**
 * Wrap an intent payload in a signed `Core_UserSigned`: fill the envelope
 * scaffolding from the context and any overrides (see
 * {@link buildEnvelopeRequest}), then sign the canonicalized request with the
 * intent-author key. The generic core shared by `buildProposeIntentBody`
 * (native transactions) and the `CustodyApi.propose` passthrough.
 *
 * @param intentSigner - Signs the canonicalized request.
 * @param input - The payload, the domain/author context, and any overrides.
 * @returns The signed `{ request, signature }` body ready to POST to
 * `/v1/intents`.
 */
export async function buildProposeEnvelope(
  intentSigner: IntentSigner,
  input: ProposeEnvelopeInput,
): Promise<ProposeIntentBody> {
  return intentSigner.signEnvelope({
    request: { ...buildEnvelopeRequest(input), type: 'Propose' as const },
  })
}
