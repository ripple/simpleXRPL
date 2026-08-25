import type { DepositPreauth } from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { toDestination } from './destination.js'
import { unsupported } from './unsupported.js'

/**
 * Map an xrpl `DepositPreauth` to Custody's native `DepositPreauth`
 * operation. Custody only models the classic address-based
 * `Authorize`/`Unauthorize`; the credential-based variants have no native
 * slot.
 *
 * @param tx - The `DepositPreauth` transaction.
 * @returns The Custody `DepositPreauth` operation.
 */
export function mapDepositPreauth(
  tx: DepositPreauth,
): components['schemas']['Core_XrplOperation_DepositPreauth'] {
  if (tx.AuthorizeCredentials !== undefined) {
    unsupported('DepositPreauth', 'AuthorizeCredentials')
  }
  if (tx.UnauthorizeCredentials !== undefined) {
    unsupported('DepositPreauth', 'UnauthorizeCredentials')
  }
  return {
    type: 'DepositPreauth',
    authorize:
      tx.Authorize === undefined ? undefined : toDestination(tx.Authorize),
    unauthorize:
      tx.Unauthorize === undefined ? undefined : toDestination(tx.Unauthorize),
  }
}
