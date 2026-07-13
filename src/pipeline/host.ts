import type { Account, AccountSelector } from '../domain/index.js'
import type { LedgerPort } from '../ports/index.js'

/**
 * The subset of the client the pipeline depends on. `SimpleXRPLClient`
 * implements it; verticals receive it so the pipeline stays decoupled from the
 * concrete client (avoids an import cycle).
 */
export interface SubmissionHost {
  /** The shared ledger connection for autofill and Local/raw submission. */
  readonly ledger: LedgerPort

  /** Resolve the account a verb acts on. */
  resolveAccount: (selector?: AccountSelector) => Account
}
