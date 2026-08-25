import type { EscrowFinish } from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { toDestination } from './destination.js'

/**
 * Map an xrpl `EscrowFinish` to Custody's native `EscrowFinish` operation.
 *
 * @param tx - The `EscrowFinish` transaction.
 * @returns The Custody `EscrowFinish` operation.
 */
export function mapEscrowFinish(
  tx: EscrowFinish,
): components['schemas']['Core_XrplOperation_EscrowFinish'] {
  return {
    type: 'EscrowFinish',
    owner: toDestination(tx.Owner),
    offerSequence: Number(tx.OfferSequence),
    condition: tx.Condition,
    fulfillment: tx.Fulfillment,
    credentialIds: tx.CredentialIDs,
  }
}
