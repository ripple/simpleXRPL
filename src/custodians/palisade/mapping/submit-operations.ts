import type { Transaction } from 'xrpl'

import type { TransactorType } from '../../../domain/index.js'
import { SignerCapabilityError } from '../../../errors.js'

import { mapAccountSet } from './account-set.js'
import { mapOfferCancel } from './offer-cancel.js'
import { mapOfferCreate } from './offer-create.js'
import { mapPaymentToTransfer } from './payment.js'
import { mapTrustSet } from './trust-set.js'

/**
 * The XRPL transactors Palisade models on a native `Submit*`/transfer path —
 * the custodian's `nativeOps` set. Keep in sync with {@link txToNativeSubmit};
 * a transactor here with no case there would route native and then throw.
 *
 * @internal
 */
export const PALISADE_NATIVE_TRANSACTORS: ReadonlySet<TransactorType> = new Set(
  [
    'Payment',
    'OfferCreate',
    'OfferCancel',
    'TrustSet',
    'AccountSet',
    // Clawback is deliberately absent (unquoted: scripts/gen-connector-routing
    // .mjs scrapes quoted strings from this literal, comments included).
    // See the note below.
  ],
)

/**
 * Why Clawback is not listed above.
 *
 * Two independent problems, both observed against the Palisade sandbox:
 *
 * 1. There is no correct field for the holder. XRPL carries the account being
 *    clawed from in `Clawback.Amount.issuer` (counter-intuitive, but it is the
 *    protocol's convention, and what `IOU.clawback` builds). Palisade's
 *    `SubmitClawback` instead takes a separate `holder`, documented in its spec
 *    as "Optional holder address for MPTokens" — while Palisade rejects MPT
 *    amounts outright. So the holder either lands in a field Palisade reads as
 *    the issuer, or in one scoped to a token type it will not accept.
 *
 * 2. Clawback cannot be enabled in the first place. `asfAllowTrustLineClawback`
 *    must be set on the issuer before it owns any trust line, and Palisade
 *    rejects that AccountSet outright (`REJECTED action=PALISADE_MANAGED`, no
 *    reason exposed through the API).
 *
 * Omitting the transactor routes Clawback to the raw-signing path when the
 * custodian allows it, and otherwise fails with a clear capability error —
 * rather than silently submitting a request whose holder is in the wrong field.
 *
 * Re-enable only once Palisade confirms both: a field that carries an IOU
 * clawback's holder, and that the enabling AccountSet is accepted.
 */

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
 * `idempotencyKey` is carried as Palisade's `externalId` dedup key, but only
 * `transfer` models that field — the `xrp/*` operation bodies have no slot for
 * it, so a retry of one of those is not deduplicated custodian-side.
 *
 * @param tx - The transaction to map.
 * @param idempotencyKey - The submission's idempotency key, when set.
 * @returns The native sub-path and request body.
 * @throws {@link SignerCapabilityError} if the transactor isn't natively modeled.
 */
export function txToNativeSubmit(
  tx: Transaction,
  idempotencyKey?: string,
): NativeSubmit {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- unlisted transactors hit `default`, by design
  switch (tx.TransactionType) {
    case 'Payment':
      return {
        subPath: 'transfer',
        body: mapPaymentToTransfer(tx, idempotencyKey),
      }
    case 'OfferCreate':
      return { subPath: 'xrp/offer-create', body: mapOfferCreate(tx) }
    case 'OfferCancel':
      return { subPath: 'xrp/offer-cancel', body: mapOfferCancel(tx) }
    case 'TrustSet':
      return { subPath: 'xrp/trust-set', body: mapTrustSet(tx) }
    case 'AccountSet':
      return { subPath: 'xrp/account-set', body: mapAccountSet(tx) }
    default:
      throw new SignerCapabilityError(
        `Palisade has no native operation for ${tx.TransactionType}. Enable ` +
          'allowRawSigning or use a Local account.',
      )
  }
}
