import type { Custodian } from '../domain/index.js'

/**
 * Configuration for {@link SimpleXRPL.init}. Custodians are pre-constructed and
 * already authenticated (each via its own `create()` / `fromEnv()`); `init`
 * only binds them to a network and builds the account index.
 */
export interface SimpleXRPLConfig {
  /** The rippled endpoint (`ws(s)://` or `http(s)://`). */
  readonly rippledUrl: string

  /** Faucet endpoint, used on test networks only. */
  readonly faucetUrl?: string

  /**
   * Pre-constructed custodians. Omit for a no-signer client that can still read
   * the ledger; write verbs then throw `NoSignerError` until a signer is added.
   */
  readonly signers?: readonly Custodian[]

  /** The default signer for verbs called without an explicit account. Defaults to `signers[0]`. */
  readonly primarySigner?: Custodian
}
