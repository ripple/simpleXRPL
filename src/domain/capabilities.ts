import type { Transaction } from 'xrpl'

/**
 * An XRPL transaction type (transactor) name, e.g. `'Payment'` or `'TrustSet'`.
 */
export type TransactorType = Transaction['TransactionType']

/**
 * What a custodian is able to sign. The dispatcher consults this at the moment
 * a write runs to choose a path: a transactor in `nativeOps` goes the native
 * route, otherwise the raw-signing fallback is used when `allowRaw` is set.
 */
export interface SignerCapabilities {
  /** The transactors this custodian models natively. */
  readonly nativeOps: ReadonlySet<TransactorType>

  /** Whether the raw-signing fallback is enabled for this custodian. */
  readonly allowRaw: boolean
}
