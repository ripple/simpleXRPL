/**
 * Custodian abstraction.
 *
 * NOTE (DGE-7463): Minimal stub of the DGE-7452 `Custodian` model — the `kind`
 * discriminant and capability shape the discovery/dispatch layers reference.
 * The full interface (sign/submitAndWait/submitAsync) is fleshed out across
 * DGE-7464/7466; reconcile when DGE-7452 lands. Shapes follow TDD §4 / §6.
 */
import type { Account } from './account.js'

/** Which signing backend a custodian wraps. */
export type CustodianKind = 'local' | 'ripple-custody' | 'palisade-custody'

/**
 * What a custodian can sign, consulted by the dispatcher (§6) and the Validate
 * stage (§5.2).
 */
export interface SignerCapabilities {
  kind: CustodianKind
  /** XRPL transactor types the backend natively models. */
  nativeOps: readonly string[]
  /** Whether the backend may sign arbitrary serialized transactions (opt-in). */
  allowRaw: boolean
}

/**
 * A signing backend that owns a set of accounts. Only the members the discovery
 * layer needs are stubbed here; the signing/submission members land later.
 */
export interface Custodian {
  readonly kind: CustodianKind
  /** Accounts this custodian owns, populated at construction. */
  listAccounts: () => Promise<Account[]>
  /** Re-run discovery and return the refreshed account list. */
  refreshAccounts: () => Promise<Account[]>
  capabilities: () => SignerCapabilities
}
