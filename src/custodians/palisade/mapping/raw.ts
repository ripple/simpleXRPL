import type { operations } from '../../../generated/palisade.js'

type RawBody =
  operations['TransactionsService_RawTransaction']['requestBody']['content']['application/json']

/**
 * Build the `RawTransaction` (sign-only) body: Palisade signs the encoded blob,
 * and the SDK submits the returned signed transaction through the shared ledger.
 *
 * @param encodedTransaction - The binary-codec-encoded XRPL transaction (hex).
 * @param externalId - Optional idempotency key.
 * @returns The raw-transaction request body.
 */
export function buildRawTransactionBody(
  encodedTransaction: string,
  externalId?: string,
): RawBody {
  const body: RawBody = {
    encodedTransaction,
    signOnly: true,
    blockchain: 'XRP_LEDGER',
  }
  if (externalId !== undefined) {
    body.externalId = externalId
  }
  return body
}
