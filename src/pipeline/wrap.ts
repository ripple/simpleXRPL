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
  const { intentId, txHash, idempotencyKey } = result
  switch (result.source) {
    case 'custody':
      return {
        intent,
        intentId,
        txHash,
        idempotencyKey,
        source: 'custody',
        response: result.response,
      }
    case 'palisade':
      return {
        intent,
        intentId,
        txHash,
        idempotencyKey,
        source: 'palisade',
        response: result.response,
      }
    case 'rippled':
    default:
      return {
        intent,
        intentId,
        txHash,
        idempotencyKey,
        source: 'rippled',
        response: result.response,
      }
  }
}
