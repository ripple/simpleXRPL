import { randomUUID } from 'node:crypto'

import { IntentValidationError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type DryRunRequest = components['schemas']['Core_IntentDryRunRequest']
type DryRunResponse = components['schemas']['Core_IntentDryRunResponse']

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
/** Dry-runs don't create a lasting resource, but the request schema still requires one. */
const DRY_RUN_EXPIRY_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

/** Inputs for pre-flighting an intent payload through Custody's dry-run endpoint. */
export interface RunDryRunOptions {
  /** The Custody domain this intent targets. */
  readonly domainId: string
  /** The intent-author's own Custody user id. */
  readonly authorUserId: string
  /** The already-built intent payload (native or raw), unsigned. */
  readonly payload: DryRunRequest['payload']
  /** The same human-readable summary the real intent will carry. */
  readonly customProperties: components['schemas']['Core_StringsMap']
}

/**
 * Pre-flight an intent payload through `POST /v1/intents/dry-run` (TDD §5.2):
 * runs Custody's own schema, policy, and fee/balance checks without creating a
 * real intent (no id consumed, no approvers notified). Unsigned — dry-run has
 * no `signature` field in its own right.
 *
 * @param client - The authenticated Custody client.
 * @param options - The domain, author, and intent payload to pre-flight.
 * @throws {@link IntentValidationError} if Custody reports the dry-run failed.
 */
export async function runDryRun(
  client: CustodyHttpClient,
  options: RunDryRunOptions,
): Promise<void> {
  const request: DryRunRequest = {
    author: { id: options.authorUserId, domainId: options.domainId },
    expiryAt: new Date(Date.now() + DRY_RUN_EXPIRY_MS).toISOString(),
    targetDomainId: options.domainId,
    id: randomUUID(),
    payload: options.payload,
    customProperties: options.customProperties,
  }

  const response = await client.post<DryRunResponse>(
    '/v1/intents/dry-run',
    request,
  )
  if (!response.success) {
    const diagnostic =
      (response.errors ?? []).join('; ') || 'no diagnostic provided'
    throw new IntentValidationError(
      `Custody dry-run failed for ${response.type}: ${diagnostic}`,
    )
  }
}
