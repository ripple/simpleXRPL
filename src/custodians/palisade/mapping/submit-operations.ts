import type { Transaction } from 'xrpl'

import type { TransactorType } from '../../../domain/index.js'
import { SignerCapabilityError } from '../../../errors.js'

import { mapAccountSet } from './account-set.js'
import { mapClawback } from './clawback.js'
import { mapOfferCancel } from './offer-cancel.js'
import { mapOfferCreate } from './offer-create.js'
import { mapPaymentToTransfer } from './payment.js'
import { mapTrustSet } from './trust-set.js'

/**
 * The XRPL transactors Palisade models on a native `Submit*`/transfer path —
 * the custodian's `nativeOps` set. Keep in sync with {@link txToNativeSubmit};
 * a transactor here with no case there would route native and then throw.
 */
export const PALISADE_NATIVE_TRANSACTORS: ReadonlySet<TransactorType> = new Set(
  [
    'Payment',
    'OfferCreate',
    'OfferCancel',
    'TrustSet',
    'AccountSet',
    'Clawback',
  ],
)

/** A native submission: the wallet-relative sub-path and its typed JSON body. */
export interface NativeSubmit {
  /** The wallet-relative op sub-path (e.g. `transfer`, `xrp/trust-set`). */
  readonly subPath: string
  /** The typed Palisade request body. */
  readonly body: unknown
}

/**
 * Map a built xrpl.js transaction to its Palisade native submission. Fields
 * with no native slot throw {@link SignerCapabilityError} rather than being
 * dropped; the custodian turns that into the raw path when enabled.
 *
 * @param tx - The transaction to map.
 * @returns The native sub-path and request body.
 * @throws {@link SignerCapabilityError} if the transactor isn't natively modeled.
 */
export function txToNativeSubmit(tx: Transaction): NativeSubmit {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- unlisted transactors hit `default`, by design
  switch (tx.TransactionType) {
    case 'Payment':
      return { subPath: 'transfer', body: mapPaymentToTransfer(tx) }
    case 'OfferCreate':
      return { subPath: 'xrp/offer-create', body: mapOfferCreate(tx) }
    case 'OfferCancel':
      return { subPath: 'xrp/offer-cancel', body: mapOfferCancel(tx) }
    case 'TrustSet':
      return { subPath: 'xrp/trust-set', body: mapTrustSet(tx) }
    case 'AccountSet':
      return { subPath: 'xrp/account-set', body: mapAccountSet(tx) }
    case 'Clawback':
      return { subPath: 'xrp/clawback', body: mapClawback(tx) }
    default:
      throw new SignerCapabilityError(
        `Palisade has no native operation for ${tx.TransactionType}. Enable ` +
          'allowRawSigning or use a Local account.',
      )
  }
}
