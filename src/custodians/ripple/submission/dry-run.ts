import { randomUUID } from 'node:crypto'

import { DryRunFailedError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import { buildEnvelopeRequest } from '../mapping/propose-envelope.js'
import type { EnvelopeRequest } from '../mapping/propose-envelope.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type DryRunResponse = components['schemas']['Core_IntentDryRunResponse']

/** Inputs for pre-flighting an intent payload through Custody's dry-run endpoint. */
export interface RunDryRunOptions {
  /** The Custody domain this intent targets. */
  readonly domainId: string
  /** The intent-author's own Custody user id. */
  readonly authorUserId: string
  /** The already-built intent payload (native or raw), unsigned. */
  readonly payload: EnvelopeRequest['payload']
  /** The same human-readable summary the real intent will carry. */
  readonly customProperties: components['schemas']['Core_StringsMap']
}

/**
 * Describe a transaction-level failure (`result` or `estimate`), if it is one.
 *
 * @param label - What failed, e.g. `estimate`.
 * @param part - The `result` or `estimate` a dry-run carries, if any.
 * @returns e.g. `estimate: insufficient funds (CurrentlyNotEnoughFunds)`, or
 *   nothing when `part` isn't a failure.
 */
function describePart(label: string, part: unknown): string[] {
  if (
    typeof part !== 'object' ||
    part === null ||
    !('type' in part) ||
    part.type !== 'Failure'
  ) {
    return []
  }
  const reason =
    'reason' in part && typeof part.reason === 'string'
      ? part.reason
      : 'no reason given'
  const hint =
    'hint' in part && typeof part.hint === 'string' ? ` (${part.hint})` : ''
  return [`${label}: ${reason}${hint}`]
}

/**
 * Describe a failed dry-run in one line, from everything Custody reported:
 * its `errors`, and for a transaction order the `result` and `estimate`.
 *
 * @param response - Custody's dry-run response.
 * @returns The message for a {@link DryRunFailedError}.
 */
export function describeDryRunFailure(response: DryRunResponse): string {
  const diagnostics = [
    ...(response.errors ?? []),
    ...describePart(
      'result',
      'result' in response ? response.result : undefined,
    ),
    ...describePart(
      'estimate',
      'estimate' in response ? response.estimate : undefined,
    ),
  ]
  const detail =
    diagnostics.length === 0 ? 'no diagnostic provided' : diagnostics.join('; ')
  return `Custody dry-run failed for ${response.type}: ${detail}`
}

/**
 * POST an unsigned envelope to `/v1/intents/dry-run` — Custody's own schema,
 * policy, and fee/balance checks, without creating an intent (no id consumed,
 * no approvers notified).
 *
 * @param client - The authenticated Custody client.
 * @param request - The envelope, as a proposal would carry it.
 * @returns Custody's dry-run response, whatever its verdict.
 */
export async function postDryRun(
  client: CustodyHttpClient,
  request: EnvelopeRequest,
): Promise<DryRunResponse> {
  return client.post<DryRunResponse>('/v1/intents/dry-run', request)
}

/**
 * Pre-flight an intent payload through Custody's dry-run, and refuse to go on
 * if it fails. Unsigned — dry-run has no `signature` field in its own right.
 *
 * @param client - The authenticated Custody client.
 * @param options - The domain, author, and intent payload to pre-flight.
 * @throws {@link DryRunFailedError} if Custody reports the dry-run failed.
 */
export async function runDryRun(
  client: CustodyHttpClient,
  options: RunDryRunOptions,
): Promise<void> {
  const response = await postDryRun(
    client,
    buildEnvelopeRequest({
      domainId: options.domainId,
      authorUserId: options.authorUserId,
      payload: options.payload,
      // A dry-run creates nothing, so it takes a fresh envelope id rather than
      // the id the real intent will be proposed under.
      overrides: {
        id: randomUUID(),
        customProperties: options.customProperties,
      },
    }),
  )
  if (!response.success) {
    throw new DryRunFailedError(describeDryRunFailure(response), response)
  }
}
