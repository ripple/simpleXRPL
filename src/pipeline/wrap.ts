import type { SubmissionResult } from '../domain/index.js'

/**
 * Attach a vertical's typed `intent` output to a custodian's transport result,
 * preserving the discriminated `source`/`response` pairing.
 *
 * @param result - The custodian's submission result.
 * @param intent - The vertical-specific output to attach.
 * @returns The result carrying the typed intent.
 */
export function withIntent<T>(
  result: SubmissionResult,
  intent: T,
): SubmissionResult<T> {
  const { intentId, txHash, idempotencyKey, quarantineReleaseIntentIds } =
    result
  switch (result.source) {
    case 'custody':
      return {
        intent,
        intentId,
        txHash,
        idempotencyKey,
        quarantineReleaseIntentIds,
        source: 'custody',
        response: result.response,
      }
    case 'palisade':
      return {
        intent,
        intentId,
        txHash,
        idempotencyKey,
        quarantineReleaseIntentIds,
        source: 'palisade',
        response: result.response,
      }
    case 'xrpld':
    default:
      return {
        intent,
        intentId,
        txHash,
        idempotencyKey,
        quarantineReleaseIntentIds,
        source: 'xrpld',
        response: result.response,
      }
  }
}
