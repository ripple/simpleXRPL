import type { Custodian } from '../domain/index.js'
import type { LedgerPort } from '../ports/index.js'

/**
 * Configuration for {@link SimpleXRPL.init}. Custodians are pre-constructed and
 * already authenticated (each via its own `create()` / `fromEnv()`); `init`
 * only binds them to a network and builds the account index.
 */
export interface SimpleXRPLConfig {
  /** The xrpld endpoint (`ws(s)://` or `http(s)://`). */
  readonly xrpldUrl: string

  /** Faucet endpoint, used on test networks only. */
  readonly faucetUrl?: string

  /**
   * Pre-constructed custodians. Omit for a no-signer client that can still read
   * the ledger; write verbs then throw `NoSignerError` until a signer is added.
   */
  readonly signers?: readonly Custodian[]

  /** The default signer for verbs called without an explicit account. Defaults to `signers[0]`. */
  readonly primarySigner?: Custodian

  /**
   * Ledger connection used for reads, autofill, and Local/raw submission.
   * Defaults to an `XrplLedger` built from `xrpldUrl`; inject a fake in tests.
   */
  readonly ledger?: LedgerPort
}
