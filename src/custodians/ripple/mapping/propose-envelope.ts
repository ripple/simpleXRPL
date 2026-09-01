import type { components } from '../../../generated/custody.js'
import { uuidV7 } from '../../../ids/index.js'
import type { IntentSigner } from '../auth/intent-signer.js'

type ProposeIntentBody = components['schemas']['Core_ProposeIntentBody']
type ProposeUserIntentPayload =
  components['schemas']['Core_ProposeUserIntentPayload']
type UserReference = components['schemas']['Core_UserReference']
type StringsMap = components['schemas']['Core_StringsMap']

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
   * resolves to the same intent. Falls back to a fresh {@link uuidV7}.
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
 * Wrap an intent payload in a signed `Core_ProposeIntentBody`: fill the envelope
 * scaffolding (author, expiry, target domain, id, custom properties) from the
 * context and any overrides, then sign the canonicalized request with the
 * intent-author key. The generic core shared by {@link buildProposeIntentBody}
 * (native transactions) and the `CustodyApi.propose` passthrough.
 *
 * @param intentSigner - Signs the canonicalized request.
 * @param input - The payload, the domain/author context, and any overrides.
 * @returns The signed `{ request, signature }` body ready to POST to
 * `/v1/intents`.
 */
export function buildProposeEnvelope(
  intentSigner: IntentSigner,
  input: ProposeEnvelopeInput,
): ProposeIntentBody {
  const overrides = input.overrides ?? {}
  const request = {
    author: overrides.author ?? {
      id: input.authorUserId,
      domainId: input.domainId,
    },
    expiryAt:
      overrides.expiryAt ??
      new Date(Date.now() + DEFAULT_INTENT_EXPIRY_MS).toISOString(),
    targetDomainId: overrides.targetDomainId ?? input.domainId,
    id: overrides.id ?? uuidV7(),
    payload: input.payload,
    customProperties: overrides.customProperties ?? {},
    type: 'Propose' as const,
    // Omit `description` entirely when absent rather than carry an undefined key.
    ...(overrides.description === undefined
      ? {}
      : { description: overrides.description }),
  }

  return intentSigner.signEnvelope({ request })
}
