import type { components } from '../../../generated/custody.js'

type TransactionDestination =
  components['schemas']['Core_TransactionDestination']

/**
 * Map a plain XRPL r-address to a Custody transaction destination. Always the
 * `Address` variant: the vertical layer only ever has a raw r-address, never a
 * Custody-internal account/endpoint id to resolve it to.
 *
 * @param address - The XRPL r-address.
 * @returns The Custody destination reference.
 */
export function toDestination(address: string): TransactionDestination {
  return { address, type: 'Address' }
}
