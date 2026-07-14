import { randomUUID } from 'node:crypto'

import type { components } from '../../../generated/custody.js'
import type { IntentSigner } from '../auth/intent-signer.js'

type ProposeIntentBody = components['schemas']['Core_ProposeIntentBody']

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
/** Default intent lifetime; matches {@link buildProposeIntentBody}'s default (TDD §10.1). */
const DEFAULT_EXPIRY_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

/** Inputs for building one signed `v0_SignManifest` intent envelope. */
export interface BuildManifestEnvelopeOptions {
  /** The Custody domain this intent targets. */
  readonly domainId: string
  /** The intent-author's own Custody user id (resolved once via `GET /v1/me`). */
  readonly authorUserId: string
  /** The Custody account UUID whose vault key signs the preimage. */
  readonly accountId: string
  /** The base64 signing preimage from {@link buildSigningPreimage}. */
  readonly preimageBase64: string
  /**
   * Stable id making a retry resolve to the same manifest (mirrors
   * {@link buildProposeIntentBody}'s `idempotencyKey`).
   */
  readonly idempotencyKey?: string
}

/**
 * Build and sign a `v0_SignManifest` intent envelope (TDD §7.2 RippleRaw): the
 * raw-signing fallback used only for transactors Custody has no native
 * operation for. Custody signs the opaque preimage under `content.type:
 * 'Unsafe'` — the `customProperties` block built by the caller (TDD §7.5) is
 * the only readable context an approver gets, since the rest is a base64 blob.
 *
 * @param intentSigner - Signs the canonicalized request (DGE-7462).
 * @param customProperties - Human-readable approval summary (TDD §7.5).
 * @param options - The domain, author, account, and preimage to sign.
 * @returns The signed `{ request, signature }` body ready to POST to `/v1/intents`.
 */
export function buildSignManifestIntentBody(
  intentSigner: IntentSigner,
  customProperties: components['schemas']['Core_StringsMap'],
  options: BuildManifestEnvelopeOptions,
): ProposeIntentBody {
  const manifestId = options.idempotencyKey ?? randomUUID()
  const request = {
    author: { id: options.authorUserId, domainId: options.domainId },
    expiryAt: new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString(),
    targetDomainId: options.domainId,
    id: manifestId,
    payload: {
      id: manifestId,
      accountId: options.accountId,
      content: { value: options.preimageBase64, type: 'Unsafe' as const },
      customProperties,
      type: 'v0_SignManifest' as const,
    },
    customProperties,
    type: 'Propose' as const,
  }

  return intentSigner.signEnvelope({ request })
}
