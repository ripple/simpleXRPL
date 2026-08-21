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

  /** Resolve the account an operation acts on. */
  resolveAccount: (selector?: AccountSelector) => Account

  /**
   * Register a locally-signed account at runtime so subsequent operations can act on
   * it. Used by `Account.create` to make a freshly generated account usable
   * (e.g. by `Account.fund` / `Account.activate`).
   */
  registerLocalAccount: (seed: string) => Account

  /**
   * The primary signer's account address, or `undefined` on a no-signer client.
   * Read methods use this as the default account to query; it never throws, so
   * reads stay available without credentials (the caller passes an address).
   */
  primaryAddress: () => string | undefined

  /**
   * Poll the custodian's transaction layer until the on-chain transaction linked
   * to `intentId` is confirmed, then return its MPT issuance ID. Present only
   * when the primary signer supports custody-side transaction observation (e.g.
   * Ripple Custody). `Token.issue` uses this to deterministically recover the
   * issuance ID without querying the XRPL ledger.
   *
   * @param intentId - The intent/order ID to look up.
   * @returns The MPT issuance ID, or an empty string on timeout.
   */
  pollMptIssuanceId?: (intentId: string) => Promise<string>
}
