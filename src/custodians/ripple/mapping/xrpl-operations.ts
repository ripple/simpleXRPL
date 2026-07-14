import type { Transaction } from 'xrpl'

import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'

import { mapAccountSet } from './account-set.js'
import { mapClawback } from './clawback.js'
import { mapDepositPreauth } from './deposit-preauth.js'
import { mapEscrowFinish } from './escrow-finish.js'
import {
  mapMPTokenAuthorize,
  mapMPTokenIssuanceCreate,
  mapMPTokenIssuanceDestroy,
  mapMPTokenIssuanceSet,
} from './mpt-operations.js'
import { mapOfferCreate } from './offer-create.js'
import { mapPayment } from './payment.js'
import { mapTrustSet } from './trust-set.js'

type XrplOperation = components['schemas']['Core_XrplOperation']

/** The 11 XRPL transactors Custody models natively (its `nativeOps` set). */
export const NATIVE_XRPL_TRANSACTORS: ReadonlySet<
  Transaction['TransactionType']
> = new Set([
  'AccountSet',
  'Clawback',
  'DepositPreauth',
  'EscrowFinish',
  'MPTokenAuthorize',
  'MPTokenIssuanceCreate',
  'MPTokenIssuanceDestroy',
  'MPTokenIssuanceSet',
  'OfferCreate',
  'Payment',
  'TrustSet',
])

/**
 * Map a built xrpl.js transaction to Custody's native operation shape (TDD
 * §7.2 — "the per-transactor switch"). Only the 11 transactors in
 * {@link NATIVE_XRPL_TRANSACTORS} are supported; within a supported
 * transactor, fields Custody's schema has no slot for throw
 * {@link SignerCapabilityError} rather than being silently dropped (TDD §7.3).
 *
 * @param tx - The transaction to map.
 * @returns The Custody native operation.
 * @throws {@link SignerCapabilityError} if the transactor isn't natively
 * modeled, or a required field has no native representation.
 */
// eslint-disable-next-line complexity -- Whitelist dispatch: non-native transactors fall through to `default`, by design.
export function txToOperation(tx: Transaction): XrplOperation {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- Unlisted transactors hit `default`, by design.
  switch (tx.TransactionType) {
    case 'AccountSet':
      return mapAccountSet(tx)
    case 'Clawback':
      return mapClawback(tx)
    case 'DepositPreauth':
      return mapDepositPreauth(tx)
    case 'EscrowFinish':
      return mapEscrowFinish(tx)
    case 'MPTokenAuthorize':
      return mapMPTokenAuthorize(tx)
    case 'MPTokenIssuanceCreate':
      return mapMPTokenIssuanceCreate(tx)
    case 'MPTokenIssuanceDestroy':
      return mapMPTokenIssuanceDestroy(tx)
    case 'MPTokenIssuanceSet':
      return mapMPTokenIssuanceSet(tx)
    case 'OfferCreate':
      return mapOfferCreate(tx)
    case 'Payment':
      return mapPayment(tx)
    case 'TrustSet':
      return mapTrustSet(tx)
    default:
      throw new SignerCapabilityError(
        `RippleCustody cannot natively sign ${tx.TransactionType}. Enable raw signing for this account, or use a different signer.`,
      )
  }
}
